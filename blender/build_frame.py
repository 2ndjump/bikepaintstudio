"""Gravel frame + fork generator for Blender 5.x.

Builds every tube as a closed tapered/oval sweep, fuses them through an SDF
grid with a fillet pass (one seamless shell, "aus einem Guss"), then tags each
face with the zone material of the nearest tube (zone ids match the three.js app).

Axes: +X forward, +Z up, +Y lateral. Units: meters. Tires touch z=0.
"""
import bpy, bmesh, math
from mathutils import Vector
from mathutils.kdtree import KDTree

D2R = math.pi / 180

# ---------------------------------------------------------------- geometry (56cm gravel)
WHEEL_R = 0.350          # 700x40c outer radius
BB_DROP = 0.072
STA, HTA = 73.5 * D2R, 71.5 * D2R
ST_LEN = 0.540           # BB -> seat tube top
STACK, REACH = 0.585, 0.385
HT_LEN = 0.165
CS_LEN = 0.425
RAKE = 0.050
HALF_REAR = 0.066        # 142mm thru-axle, stay centerline
HALF_FRONT = 0.056       # 100mm thru-axle
DROP_HALF_REAR = 0.0065  # half thickness of the dropout bosses (lateral)
DROP_HALF_FRONT = 0.0080

BBZ = WHEEL_R - BB_DROP
BB = Vector((0, 0, BBZ))
def P(x, y, z):  # helper: coords relative to BB
    return Vector((x, y, z)) + BB

st_dir = Vector((-math.cos(STA), 0, math.sin(STA)))
ht_up = Vector((-math.cos(HTA), 0, math.sin(HTA)))
ht_top = P(REACH, 0, STACK)
ht_bot = ht_top - ht_up * HT_LEN
rear_hub = P(-math.sqrt(CS_LEN**2 - BB_DROP**2), 0, BB_DROP)
fwd_n = Vector((math.sin(HTA), 0, math.cos(HTA)))           # perpendicular to steering axis, forward
t = (ht_bot.z + RAKE * fwd_n.z - rear_hub.z) / ht_up.z
front_hub = ht_bot - ht_up * t + fwd_n * RAKE
front_hub.z = rear_hub.z

def st_at(f):
    return BB + st_dir * (ST_LEN * f)
def ht_at(f):  # 0 = bottom, 1 = top
    return ht_bot + ht_up * (HT_LEN * f)

# ---------------------------------------------------------------- sweep builder
def catmull(pts, n):
    """Smooth sample through control points (centripetal-ish uniform Catmull-Rom)."""
    if len(pts) == 2:
        return [pts[0].lerp(pts[1], i / (n - 1)) for i in range(n)]
    ext = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    segs = len(pts) - 1
    out = []
    for i in range(n):
        u = i / (n - 1) * segs
        k = min(int(u), segs - 1)
        s = u - k
        p0, p1, p2, p3 = ext[k], ext[k + 1], ext[k + 2], ext[k + 3]
        s2, s3 = s * s, s * s * s
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3))
    return out

def lerp_key(keys, u):
    """keys: list of (u, value) sorted; smoothstep between keys."""
    if u <= keys[0][0]:
        return keys[0][1]
    for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
        if u <= u1:
            s = (u - u0) / (u1 - u0)
            s = s * s * (3 - 2 * s)
            return v0 + (v1 - v0) * s
    return keys[-1][1]

def superellipse(theta, a, b, e):
    c, s = math.cos(theta), math.sin(theta)
    x = a * math.copysign(abs(c) ** (2 / e), c)
    y = b * math.copysign(abs(s) ** (2 / e), s)
    return x, y

TUBES = []  # (zone, samples[(point, radius)]) for zone classification

def kamm_tail(x, y, a, b, k):
    """Truncated-airfoil section: rounded nose at +y, tail (−y) narrows and is
    smoothly cut off. k = 0 leaves the section untouched."""
    if k <= 0 or y >= 0:
        return x, y
    t = -y / b
    x *= 1 - 0.38 * k * t ** 1.6
    c = (1 - 0.32 * k) * b
    return x, -c * math.tanh(-y / c)

def sweep(name, zone, ctrl, r_keys, wy_keys=((0, 1.0),), wz_keys=((0, 1.0),), expo=2.0,
          n=60, ring=48, side=Vector((0, 1, 0)), kamm_keys=((0, 0.0),), lead=Vector((1, 0, 0))):
    """Closed swept tube. r = base radius, wy = lateral scale, wz = in-plane scale.
    kamm_keys > 0 turns the section into a Kamm-tail airfoil with its nose towards `lead`."""
    pts = catmull([Vector(p) for p in ctrl], n)
    bm = bmesh.new()
    rings = []
    samples = []
    for i, p in enumerate(pts):
        u = i / (n - 1)
        tng = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        lat = (side - tng * side.dot(tng)).normalized()
        nrm = tng.cross(lat).normalized()
        if any(v > 0 for _, v in kamm_keys) and nrm.dot(lead) < 0:
            nrm = -nrm
            lat = -lat          # keep the ring winding consistent
        r = lerp_key(r_keys, u)
        a, b = r * lerp_key(wy_keys, u), r * lerp_key(wz_keys, u)
        k = lerp_key(kamm_keys, u)
        vs = []
        for j in range(ring):
            x, y = superellipse(2 * math.pi * j / ring, a, b, expo)
            x, y = kamm_tail(x, y, a, b, k)
            vs.append(bm.verts.new(p + lat * x + nrm * y))
        rings.append(vs)
        samples.append((p.copy(), min(a, b), max(a, b)))
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(ring):
            bm.faces.new((r0[j], r0[(j + 1) % ring], r1[(j + 1) % ring], r1[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    TUBES.append((zone, samples))
    return ob

def cylinder_y(name, zone, center, r, half_w, ring=64, edge=0.0):
    """Lateral cylinder; edge > 0 rounds both rims (radius drop at the faces)."""
    f = min(0.45, edge * 1.2 / (2 * half_w))     # rounding zone as a fraction of the width
    keys = ((0, r),) if edge == 0 else ((0, r - edge), (f * 0.5, r - edge * 0.25), (f, r),
                                        (1 - f, r), (1 - f * 0.5, r - edge * 0.25), (1, r - edge))
    return sweep(name, zone, [center + Vector((0, -half_w, 0)), center + Vector((0, half_w, 0))],
                 keys, n=8 if edge == 0 else 40, ring=ring, side=Vector((0, 0, 1)))

# ---------------------------------------------------------------- frame tubes
def frame_parts():
    parts = []
    # Head tube: tapered 1.5" -> 1 1/8", slight waist, extends a few mm past bearings
    parts.append(sweep("headTube", "headTube", [ht_at(-0.04), ht_at(0.5), ht_at(1.0)],
                       ((0, 0.0285), (0.45, 0.0235), (1, 0.0215)), n=40, ring=64,
                       side=Vector((0, 1, 0))))
    # Top tube: slim, slightly taller than wide, flares only right at the head tube
    tt_rear = st_at(0.885)
    tt_front = ht_at(0.80)
    parts.append(sweep("topTube", "topTube",
                       [tt_rear, tt_rear.lerp(tt_front, 0.5) + Vector((0, 0, 0.004)), tt_front],
                       ((0, 0.0122), (0.55, 0.0122), (0.85, 0.0132), (1, 0.0158)),
                       wy_keys=((0, 1.0), (0.8, 1.02), (1, 1.2)), wz_keys=((0, 1.12), (1, 1.05)),
                       expo=2.2))
    # Down tube: bulky truncated-airfoil (Kamm tail) section, nose facing forward/down,
    # flares wide and flat into the BB
    dt_front = ht_at(0.18)
    parts.append(sweep("downTube", "downTube",
                       [BB + Vector((0.0, 0, -0.002)), BB.lerp(dt_front, 0.5) + Vector((0, 0, -0.006)), dt_front],
                       ((0, 0.0265), (0.3, 0.0270), (1, 0.0265)),
                       wy_keys=((0, 1.55), (0.18, 1.25), (0.4, 0.98), (1, 0.98)),
                       wz_keys=((0, 0.92), (0.2, 1.22), (0.4, 1.42), (0.85, 1.36), (1, 1.15)),
                       kamm_keys=((0, 0.0), (0.25, 0.85), (0.85, 0.85), (1, 0.3)),
                       expo=2.3, n=80, ring=64))
    # Seat tube: round up top (31.6 post), widens laterally at the BB
    parts.append(sweep("seatTube", "seatTube", [BB, st_at(0.5), st_at(1.0)],
                       ((0, 0.021), (0.35, 0.0175), (0.975, 0.0175), (1, 0.0158)),  # rounded top rim
                       wy_keys=((0, 1.55), (0.35, 1.05), (1, 1.0)), expo=2.0))
    # BB shell (86.5 press fit)
    parts.append(cylinder_y("bbShell", "downTube", BB, 0.0262, 0.0435, edge=0.0055))  # molded BB body, soft rims
    # BB junction: a broad molded gusset that carries the chainstay tops smoothly
    # into the seat tube base (no pinched crease in close-ups)
    parts.append(sweep("bbJunction", "seatTube", [BB + Vector((-0.012, 0, -0.002)), st_at(0.06), st_at(0.13)],
                       ((0, 0.0215), (0.55, 0.0200), (1, 0.0180)),
                       wy_keys=((0, 1.95), (0.5, 1.6), (1, 1.2)), wz_keys=((0, 1.05), (1, 1.0)),
                       expo=2.4, n=30, ring=64))
    # Chainstays + seatstays + dropouts, both sides
    for s, tag in ((1, "R"), (-1, "L")):
        hub = rear_hub + Vector((0, s * HALF_REAR, 0))
        parts.append(sweep(f"chainStay{tag}", "chainStays",
                           [BB + Vector((-0.004, s * 0.031, -0.003)),
                            P(-0.090, s * 0.047, 0.010),
                            P(-0.240, s * 0.060, 0.040),
                            hub + Vector((0.012, 0, -0.003))],
                           ((0, 0.0170), (0.12, 0.0145), (0.4, 0.0115), (1, 0.0085)),
                           wy_keys=((0, 0.8), (0.4, 0.75), (1, 0.85)),
                           wz_keys=((0, 1.35), (1, 1.15)), expo=2.4, n=70, ring=40,
                           side=Vector((0, 1, 0))))
        ss_top = st_at(0.79) + Vector((-0.004, s * 0.011, 0))
        mid = hub.lerp(ss_top, 0.82)
        mid.y = s * 0.036
        parts.append(sweep(f"seatStay{tag}", "seatStays",
                           [hub + Vector((0.004, 0, 0.012)), hub.lerp(ss_top, 0.45) + Vector((0, s * 0.002, 0)), mid, ss_top],
                           ((0, 0.0085), (0.6, 0.0080), (1, 0.0095)),
                           wy_keys=((0, 0.75), (1, 0.85)), wz_keys=((0, 1.15), (1, 1.25)),
                           expo=2.2, n=70, ring=40, side=Vector((0, 1, 0))))
        # dropout boss: as thick as the stays, rounded faces, wraps the axle
        parts.append(cylinder_y(f"dropout{tag}", "chainStays", hub, 0.0165, DROP_HALF_REAR, edge=0.0025))
    return parts

def fork_parts():
    parts = []
    crown_c = ht_bot - ht_up * 0.018
    for s, tag in ((1, "R"), (-1, "L")):
        tip = front_hub + Vector((0, s * HALF_FRONT, 0))
        # blades grow out of the crown centre: wide at the top, splitting into a "Y"
        top = ht_at(-0.04) - ht_up * 0.012 + Vector((0, s * 0.013, 0))
        sh = top - ht_up * 0.050 + Vector((0, s * 0.040, 0))
        mid = sh.lerp(tip, 0.5)
        mid.y = s * 0.0565
        # aero blade: deep, narrow Kamm-tail section that relaxes to an oval at the tip
        parts.append(sweep(f"forkBlade{tag}", "fork",
                           [top, sh, mid, tip],
                           ((0, 0.0205), (0.18, 0.0165), (0.45, 0.0150), (0.92, 0.0118), (1, 0.0112)),
                           wy_keys=((0, 0.92), (0.2, 0.66), (0.85, 0.68), (1, 0.66)),
                           wz_keys=((0, 1.3), (0.2, 1.75), (0.8, 1.65), (1, 1.3)),
                           kamm_keys=((0, 0.0), (0.2, 0.75), (0.8, 0.75), (0.97, 0.0)),
                           expo=2.2, n=80, ring=48, side=Vector((0, 1, 0))))
        # dropout boss centred on the axle, same width as the blade tip
        parts.append(cylinder_y(f"forkDropout{tag}", "fork", tip, 0.0150, DROP_HALF_FRONT, edge=0.0030))
    # integrated crown: starts with exactly the head tube's bottom section (1mm
    # headset gap) and widens laterally to swallow the blade tops
    gap_top = ht_at(-0.04) - ht_up * 0.001
    parts.append(sweep("forkCrown", "fork",
                       [gap_top, gap_top - ht_up * 0.022, gap_top - ht_up * 0.046],
                       ((0, 0.0285), (0.5, 0.0280), (1, 0.0245)),
                       wy_keys=((0, 1.0), (0.5, 1.2), (1, 1.6)), wz_keys=((0, 1.0), (1, 1.12)),
                       expo=2.2, n=24, ring=64, side=Vector((0, 1, 0))))
    return parts

# ---------------------------------------------------------------- fuse via SDF + fillet
def fuse(name, parts, voxel, fillet_iters, band, smooth_iters=0):
    coll = bpy.data.collections.get("_build") or bpy.data.collections.new("_build")
    for p in parts:
        coll.objects.link(p)
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)

    ng = bpy.data.node_groups.new(name + "_fuse", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    ci = N.new("GeometryNodeCollectionInfo")
    ci.inputs["Collection"].default_value = coll
    ci.transform_space = 'ORIGINAL'
    real = N.new("GeometryNodeRealizeInstances")
    sdf = N.new("GeometryNodeMeshToSDFGrid")
    sdf.inputs["Voxel Size"].default_value = voxel
    sdf.inputs["Band Width"].default_value = band
    fil = N.new("GeometryNodeSDFGridFillet")
    fil.inputs["Iterations"].default_value = fillet_iters
    tom = N.new("GeometryNodeGridToMesh")
    tom.inputs["Threshold"].default_value = 0.0
    tom.inputs["Adaptivity"].default_value = 0.0
    out = N.new("NodeGroupOutput")
    L = ng.links
    L.new(ci.outputs[0], real.inputs[0])
    L.new(real.outputs[0], sdf.inputs["Mesh"])
    L.new(sdf.outputs[0], fil.inputs["Grid"])
    last = fil
    if smooth_iters:
        # mean-curvature flow evens out the remaining creases where 3+ tubes meet
        mc = N.new("GeometryNodeSDFGridMeanCurvature")
        mc.inputs["Iterations"].default_value = smooth_iters
        L.new(fil.outputs[0], mc.inputs["Grid"])
        last = mc
    L.new(last.outputs[0], tom.inputs["Grid"])
    L.new(tom.outputs[0], out.inputs[0])
    mod = ob.modifiers.new("fuse", "NODES")
    mod.node_group = ng
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    new = bpy.data.meshes.new_from_object(ev)
    ob.modifiers.clear()
    ob.data = new
    bpy.data.meshes.remove(me)
    bpy.data.node_groups.remove(ng)
    for p in parts:
        bpy.data.meshes.remove(p.data)
    return ob

def assign_zones(ob, zones, tubes):
    """Material index per face = zone of nearest tube surface (distance - radius)."""
    me = ob.data
    me.materials.clear()
    for z in zones:
        me.materials.append(bpy.data.materials.get(z) or bpy.data.materials.new(z))
    zi = {z: i for i, z in enumerate(zones)}
    pts = []
    for zone, samples in tubes:
        if zone not in zi:
            continue
        for k in range(len(samples) - 1):
            p0, rmin0, rmax0 = samples[k]
            p1, _, _ = samples[k + 1]
            for f in (0.0, 0.5):
                pts.append((p0.lerp(p1, f), rmin0, rmax0, zi[zone]))
    kd = KDTree(len(pts))
    for i, (p, *_rest) in enumerate(pts):
        kd.insert(p, i)
    kd.balance()
    idx = [0] * len(me.polygons)
    for poly in me.polygons:
        best, bz = 1e9, 0
        for co, i, d in kd.find_n(poly.center, 24):
            _, rmin, rmax, z = pts[i]
            score = d - 0.5 * (rmin + rmax)
            if score < best:
                best, bz = score, z
        idx[poly.index] = bz
    me.polygons.foreach_set("material_index", idx)
    me.update()

def shade(ob):
    me = ob.data
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()

def build(voxel=0.0008, fillet=12, band=14, smooth=0):
    TUBES.clear()
    frame = fuse("Frame", frame_parts(), voxel, fillet, band, smooth)
    frame_tubes = list(TUBES)
    TUBES.clear()
    fork = fuse("Fork", fork_parts(), voxel, fillet, band, smooth)
    fork_tubes = list(TUBES)
    assign_zones(frame, ["headTube", "topTube", "downTube", "seatTube", "seatStays", "chainStays"], frame_tubes)
    assign_zones(fork, ["fork"], fork_tubes)
    for o in (frame, fork):
        shade(o)
    c = bpy.data.collections.get("_build")
    if c:
        bpy.data.collections.remove(c)
    return frame, fork

KEY = dict(BB=BB, rear_hub=rear_hub, front_hub=front_hub, ht_top=ht_top, ht_bot=ht_bot,
           HALF_REAR=HALF_REAR, HALF_FRONT=HALF_FRONT, WHEEL_R=WHEEL_R,
           DROP_HALF_REAR=DROP_HALF_REAR, DROP_HALF_FRONT=DROP_HALF_FRONT)
