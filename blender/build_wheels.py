"""Wheels: 50mm-deep carbon rims (622 BSD, 30mm external width), 700x40c gravel
tires with tan sidewalls, straight-pull bladed spokes, hubs and 160mm rotors.
Wheel axis = world Y, drive side = -Y. Run after build_frame.py (uses KEY)."""
import bpy, bmesh, math
from mathutils import Vector

RIM_TOP = 0.3145          # hook top radius
RIM_DEPTH = 0.050
RIM_BOT = RIM_TOP - RIM_DEPTH
SEG = 192

def mat(name):
    return bpy.data.materials.get(name) or bpy.data.materials.new(name)

def lathe(name, profile, center, seg=SEG, mat_idx=None, closed=True):
    """profile: list of (r, y); revolved around the Y axis through center."""
    bm = bmesh.new()
    rings = []
    for k in range(seg):
        a = 2 * math.pi * k / seg
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new(center + Vector((r * ca, y, r * sa))) for r, y in profile])
    n = len(profile)
    m = n if closed else n - 1
    for k in range(seg):
        r0, r1 = rings[k], rings[(k + 1) % seg]
        for j in range(m):
            f = bm.faces.new((r0[j], r0[(j + 1) % n], r1[(j + 1) % n], r1[j]))
            f.smooth = True
            if mat_idx:
                f.material_index = mat_idx(j)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    return ob

def mirror_profile(half):
    """half: (r, y>=0) from bottom center (y=0) around to top center (y=0)."""
    back = [(r, -y) for r, y in reversed(half[1:-1])]
    return half + back

def rim_profile():
    # outer U (spoke bed -> brake wall -> hook), then tire bed back to the centre
    outer = [(RIM_BOT, 0.0), (RIM_BOT + 0.0006, 0.0030), (RIM_BOT + 0.0025, 0.0068),
             (RIM_BOT + 0.0060, 0.0102), (RIM_BOT + 0.0120, 0.0130), (RIM_BOT + 0.0200, 0.0148),
             (RIM_BOT + 0.0300, 0.0155), (RIM_BOT + 0.0400, 0.0153), (RIM_TOP - 0.0030, 0.0149),
             (RIM_TOP - 0.0008, 0.0146), (RIM_TOP, 0.0140), (RIM_TOP, 0.0128)]
    inner = [(RIM_TOP - 0.0045, 0.0125), (0.3090, 0.0110), (0.3060, 0.0060), (0.3058, 0.0)]
    return mirror_profile(outer + inner)

def tire_profile(width=0.040, outer_r=0.350):
    half = width / 2
    c_r = outer_r - half
    pts = []
    # bead (inside rim hooks) -> sidewall -> tread crown
    pts.append((0.3088, 0.0))
    pts.append((0.3092, 0.0108))
    pts.append((0.3125, 0.0118))
    steps = 28
    a0 = math.asin(max(-1, min(1, (0.3125 - c_r) / half)))
    for i in range(steps + 1):
        a = a0 + (math.pi / 2 - a0) * i / steps
        r = c_r + math.sin(a) * half
        y = math.cos(a) * half * (0.97 if a > 1.1 else 1.0)
        pts.append((r, max(y, 0.0)))
    pts[-1] = (outer_r, 0.0)
    prof = mirror_profile(pts[:-1] + [pts[-1]])
    return prof

def spokes(name, center, flange_y, flange_r, n=24, cross=1):
    bm = bmesh.new()
    w, t = 0.0011, 0.00045         # bladed spoke half sizes
    per_side = n // 2
    for side in (1, -1):
        for i in range(per_side):
            base = 2 * math.pi * i / per_side + (math.pi / per_side if side < 0 else 0)
            lead = 1 if i % 2 == 0 else -1
            ah = base
            ar = base + lead * cross * 2 * math.pi / per_side * 0.95
            h = center + Vector((flange_r * math.cos(ah), side * flange_y, flange_r * math.sin(ah)))
            rr = RIM_BOT + 0.0015
            r = center + Vector((rr * math.cos(ar), side * 0.0025, rr * math.sin(ar)))
            d = (r - h).normalized()
            blade = d.cross(Vector((0, 1, 0))).normalized()   # in the wheel plane
            thick = d.cross(blade).normalized()
            ring = []
            for p in (h, r):
                ring.append([bm.verts.new(p + blade * bx * w + thick * tx * t)
                             for bx, tx in ((1, 0), (0.6, 1), (-0.6, 1), (-1, 0), (-0.6, -1), (0.6, -1))])
            a, b = ring
            for j in range(6):
                f = bm.faces.new((a[j], a[(j + 1) % 6], b[(j + 1) % 6], b[j]))
                f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return bpy.data.objects.new(name, me)

def hub_profile(half_axle, flange_y, flange_r):
    h = [(0.0, half_axle), (0.0085, half_axle), (0.0090, half_axle - 0.004), (0.0125, half_axle - 0.006),
         (0.0125, flange_y + 0.004), (flange_r, flange_y + 0.0025), (flange_r, flange_y - 0.0025),
         (0.0150, flange_y - 0.007), (0.0135, 0.0)]
    return h + [(r, -y) for r, y in reversed(h[:-1])]

def circle_pts(cx, cy, r, n):
    return [(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)]

def flat_part(name, loops, thickness, center, y):
    """Extruded 2D shape (even-odd fill, so inner loops are holes) lying in the
    wheel plane. Object origin = hub centre, local Z = wheel axis."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '2D'
    cu.fill_mode = 'BOTH'
    cu.extrude = thickness / 2
    cu.resolution_u = 1
    for loop in loops:
        sp = cu.splines.new('POLY')
        sp.points.add(len(loop) - 1)
        for p, (x, z) in zip(sp.points, loop):
            p.co = (x, z, 0, 1)
        sp.use_cyclic_u = True
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    bpy.context.scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (center.x, y, center.z)
    ob.rotation_euler = (-math.pi / 2, 0, 0)     # local XY plane -> world XZ, local Z -> world Y
    return ob

def rotor(name, center, y, r_out=0.080):
    """160mm two-piece centerlock rotor: drilled steel braking ring, six swept
    arms, black alloy carrier + lockring."""
    r_in = 0.0640
    holes = []
    pitch = 2 * math.pi / 30
    for k in range(30):
        a = k * pitch
        holes.append(list(reversed(circle_pts(0.0752 * math.cos(a), 0.0752 * math.sin(a), 0.0017, 16))))
        a2 = a + pitch / 2
        holes.append(list(reversed(circle_pts(0.0692 * math.cos(a2), 0.0692 * math.sin(a2), 0.0019, 16))))
    # outer edge with a fine scallop, as on modern road/gravel rotors
    outer = [((r_out - 0.0004 * (1 - math.cos(30 * 2 * math.pi * k / 360))) * math.cos(2 * math.pi * k / 360),
              (r_out - 0.0004 * (1 - math.cos(30 * 2 * math.pi * k / 360))) * math.sin(2 * math.pi * k / 360))
             for k in range(360)]
    ring = flat_part(name + "Ring", [outer, list(reversed(circle_pts(0, 0, r_in, 180)))] + holes, 0.0018, center, y)

    arms = []
    for k in range(6):
        a0 = 2 * math.pi * k / 6
        left, right = [], []
        steps = 14
        for i in range(steps + 1):
            t = i / steps
            r = 0.0235 + (r_in + 0.0035 - 0.0235) * t
            th = a0 + math.radians(32) * (t * t * (3 - 2 * t))
            w = 0.0042 - 0.0013 * math.sin(math.pi * t)          # waisted arm
            # perpendicular to the centreline in 2D
            dr, dth = (r_in + 0.0035 - 0.0235), math.radians(32) * 6 * t * (1 - t)
            tx, tz = dr * math.cos(th) - r * dth * math.sin(th), dr * math.sin(th) + r * dth * math.cos(th)
            ln = math.hypot(tx, tz)
            nx, nz = -tz / ln, tx / ln
            cx, cz = r * math.cos(th), r * math.sin(th)
            left.append((cx + nx * w, cz + nz * w))
            right.append((cx - nx * w, cz - nz * w))
        arms.append(left + list(reversed(right)))
    arm_ob = flat_part(name + "Arms", arms, 0.0016, center, y)

    carrier_outer = []
    for k in range(240):
        a = 2 * math.pi * k / 240
        r = 0.0255 + 0.0020 * max(0.0, math.cos(6 * a)) ** 3           # six lobes under the arms
        carrier_outer.append((r * math.cos(a), r * math.sin(a)))
    carrier = flat_part(name + "Carrier", [carrier_outer, list(reversed(circle_pts(0, 0, 0.0170, 96)))],
                        0.0030, center, y - math.copysign(0.0009, y))
    # centerlock lockring with 12 notches
    lock_outer = []
    for k in range(240):
        a = 2 * math.pi * k / 240
        notch = 0.0012 if (k % 20) < 4 else 0.0
        lock_outer.append(((0.0205 - notch) * math.cos(a), (0.0205 - notch) * math.sin(a)))
    lock = flat_part(name + "Lockring", [lock_outer, list(reversed(circle_pts(0, 0, 0.0120, 96)))],
                     0.0035, center, y + math.copysign(0.0025, y))
    return ring, arm_ob, carrier, lock

def thru_axle(name, center, y_out, outward, r=0.0095, depth=0.0040):
    """Axle head sitting on the outside face of a dropout boss (outward = +1/-1)."""
    s = outward
    prof = [(0.0, y_out), (r - 0.0008, y_out), (r, y_out + s * 0.0008), (r, y_out + s * (depth - 0.0012)),
            (r - 0.0012, y_out + s * depth), (0.0042, y_out + s * depth), (0.0036, y_out + s * (depth - 0.0015)),
            (0.0, y_out + s * (depth - 0.0015))]
    return lathe(name, prof, Vector((center.x, 0, center.z)), seg=64, closed=False)

def build_wheel(prefix, center, rim_zone, half_axle, flange_y, rotor_y, axle_face):
    coll = bpy.data.collections.get("Wheels") or bpy.data.collections.new("Wheels")
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    objs = []
    rim = lathe(f"{prefix}Rim", rim_profile(), center)
    rim.data.materials.append(mat(rim_zone))
    objs.append(rim)
    tp = tire_profile()
    tire = lathe(f"{prefix}Tire", tp, center,
                 mat_idx=lambda j: 0 if min(tp[j][0], tp[(j + 1) % len(tp)][0]) > 0.3385 else 1)
    tire.data.materials.append(mat("Tire_Tread"))
    tire.data.materials.append(mat("Tire_Sidewall"))
    objs.append(tire)
    hub = lathe(f"{prefix}Hub", hub_profile(half_axle, flange_y, 0.022), center, seg=64)
    hub.data.materials.append(mat("Hub"))
    objs.append(hub)
    sp = spokes(f"{prefix}Spokes", center, flange_y, 0.019)
    sp.data.materials.append(mat("Spokes"))
    objs.append(sp)
    for o in objs:
        o.location = (0, 0, 0)
    ring, arms, carrier, lock = rotor(f"{prefix}Rotor", center, rotor_y)
    ring.data.materials.append(mat("Rotor"))
    arms.data.materials.append(mat("Rotor"))
    carrier.data.materials.append(mat("Hub"))
    lock.data.materials.append(mat("Hub"))
    objs += [ring, arms, carrier, lock]
    # thru-axle: head on the non-drive side, flush nut on the drive side
    for s, tag in ((1, "Head"), (-1, "Nut")):
        ax = thru_axle(f"{prefix}Axle{tag}", center, s * axle_face, s, depth=0.0045 if s > 0 else 0.0025)
        ax.data.materials.append(mat("Hub"))
        ax.location = (0, 0, 0)
        objs.append(ax)
    root = bpy.data.objects.new(f"{prefix}Wheel", None)
    root.empty_display_size = 0.05
    coll.objects.link(root)
    for o in objs:
        coll.objects.link(o)
        o.parent = root
    return root

def build(KEY):
    # Profiles are built at world positions; parent empties stay at the origin.
    # Hub end caps stop at the inside face of the dropout bosses, axle heads
    # sit on the outside face.
    hf, hr = KEY["HALF_FRONT"], KEY["HALF_REAR"]
    df, dr = KEY["DROP_HALF_FRONT"], KEY["DROP_HALF_REAR"]
    front = build_wheel("Front", KEY["front_hub"], "frontRim", hf - df, 0.030, 0.0445, hf + df)
    rear = build_wheel("Rear", KEY["rear_hub"], "rearRim", hr - dr, 0.034, 0.0515, hr + dr)
    return front, rear
