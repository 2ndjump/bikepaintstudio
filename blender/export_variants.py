"""Build the four frame variants and export one GLB each for the web app:
public/assets/bike_<discipline>_<style>.glb. In Blender:
exec(open(r"<repo>/blender/export_variants.py").read()) — or set VARIANTS in the
exec globals to export a subset. Works in the current (cleared) scene; never
saves the .blend.

Per GLB (glTF axes: +X forward, +Y up, +Z toward the drive side; tires touch y=0):
  zone_<ZoneId>  one painted mesh per frame zone, with paint UVs
  hw_steel       rotor braking rings + arms
  hw_black       rotor carriers, lockrings, thru-axles
  scene extras   frontHub / rearHub [x,y,z], wheelRadius, tireWidth (outer, m),
                 hubHalfFront / hubHalfRear (dropout inner faces, m)
Rims, tires, hubs and spokes stay procedural in the app (RimParams).

Paint UVs follow the app's old procedural tubes: u runs once around the tube
(arc length, seam at the underside / inner flank), v along the tube's centreline
(arc length, 0..1, extrapolated past the ends; the app mirrors there). Each
face takes the UV frame of its zone's nearest main tube; junction parts (BB
shell, dropouts, crown) continue their neighbour's mapping.
"""
import bpy, math, os
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else r"C:\Users\Jannes\Documents\repo\bike frame designer\blender"
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "assets"))
VARIANTS = globals().get("VARIANTS", ("gravel_classic", "gravel_aero", "road_classic", "road_aero"))

# Frame SDF resolution as in run_all.py; the shell is decimated for the web.
VOXEL, FILLET, BAND, SMOOTH = 0.0008, 20, 16, 4
FRAME_TRIS, FORK_TRIS = 70000, 16000

# Lateral axis of the app's old tube frames (web +Z = Blender -Y).
ZW = Vector((0, -1, 0))
# Main tubes carrying the paint UVs: part -> (zone, reverse the build direction,
# u offset). u 0.25 is the drive-side (-Y) face of an unshifted tube; the
# non-drive member of each pair is shifted so a decal lands on both outer faces.
UV_PARTS = {
    "headTube": ("headTube", False, 0.0),       # v: bottom -> top
    "topTube": ("topTube", True, 0.0),          # head tube -> seat tube
    "downTube": ("downTube", True, 0.0),        # head tube -> BB
    "seatTube": ("seatTube", False, 0.0),       # BB -> top
    "chainStayL": ("chainStays", False, 0.0),   # BB -> dropout
    "chainStayR": ("chainStays", False, 0.5),
    "seatStayL": ("seatStays", True, 0.0),      # seat tube -> dropout
    "seatStayR": ("seatStays", True, 0.5),
    "forkBladeL": ("fork", True, 0.25),         # dropout -> crown, seam on the inner flank
    "forkBladeR": ("fork", True, 0.75),
}


def load(name, **extra):
    ns = {"__file__": os.path.join(HERE, name), **extra}
    exec(compile(open(ns["__file__"]).read(), name, "exec"), ns)
    return ns


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
        for d in list(coll):
            coll.remove(d)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


# ---------------------------------------------------------------- paint UVs
class UVTube:
    """One main tube: centreline samples with arc length, frame and an
    angle -> arc-length table of its section ring."""

    def __init__(self, name, sections, reverse, offset):
        if reverse:
            sections = sections[::-1]
        self.name, self.offset = name, offset
        self.c = [c for c, _ in sections]
        n = len(self.c)
        self.s = [0.0]
        for k in range(1, n):
            self.s.append(self.s[-1] + (self.c[k] - self.c[k - 1]).length)
        self.length = self.s[-1]
        self.frames, self.tables, self.radius = [], [], []
        for k in range(n):
            t = (self.c[min(k + 1, n - 1)] - self.c[max(k - 1, 0)]).normalized()
            side = t.cross(ZW).normalized()
            fore = t.cross(side)
            self.frames.append((t, side, fore))
            ring = sections[k][1]
            self.radius.append(sum((p - self.c[k]).length for p in ring) / len(ring))
            self.tables.append(self._table(ring, self.c[k], side, fore))
        self.kd = KDTree(n)
        for k, c in enumerate(self.c):
            self.kd.insert(c, k)
        self.kd.balance()

    @staticmethod
    def _table(ring, c, side, fore):
        """(phi, u) pairs: u = arc length around the ring from the seam at -side."""
        pts = sorted(((math.atan2((p - c).dot(fore), (p - c).dot(side)), p) for p in ring), key=lambda e: e[0])
        seg = [(pts[j + 1][1] - pts[j][1]).length for j in range(len(pts) - 1)]
        close = (pts[0][1] - pts[-1][1]).length
        perim = sum(seg) + close
        # where the seam (phi = +-pi) cuts the closing segment
        span = pts[0][0] + 2 * math.pi - pts[-1][0]
        f = (math.pi - pts[-1][0]) / span if span > 1e-9 else 0.5
        u = close * (1 - f) / perim
        table = [(-math.pi, 0.0), (pts[0][0], u)]
        for j, d in enumerate(seg):
            u += d / perim
            table.append((pts[j + 1][0], u))
        table.append((math.pi, 1.0))
        return table

    def uv(self, p):
        k = self.kd.find(p)[1]
        n = len(self.c)
        best = None
        for a in (k - 1, k):
            if a < 0 or a + 1 >= n:
                continue
            d = self.c[a + 1] - self.c[a]
            t = (p - self.c[a]).dot(d) / d.length_squared
            if 0 < a < n - 2:
                t = min(max(t, 0.0), 1.0)
            elif a == 0:
                t = min(t, 1.0)          # extrapolate before the start
            if a == n - 2:
                t = max(t, 0.0)          # ... and past the end
            q = self.c[a] + d * t
            dist = (p - q).length
            if best is None or dist < best[0]:
                best = (dist, q, self.s[a] + d.length * t)
        _, q, s = best
        _, side, fore = self.frames[k]
        phi = math.atan2((p - q).dot(fore), (p - q).dot(side))
        table = self.tables[k]
        lo, hi = 0, len(table) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if table[mid][0] <= phi:
                lo = mid
            else:
                hi = mid
        (p0, u0), (p1, u1) = table[lo], table[hi]
        u = u0 + (u1 - u0) * ((phi - p0) / (p1 - p0) if p1 > p0 else 0.0)
        return (u + self.offset) % 1.0, s / self.length


def paint_uvs(ob, sections):
    """UV map 'paint' on a zone-tagged shell (material name = ZoneId)."""
    me = ob.data
    tubes_by_zone = {}
    for name, (zone, rev, off) in UV_PARTS.items():
        tubes_by_zone.setdefault(zone, []).append(UVTube(name, sections[name], rev, off))
    uvl = me.uv_layers.new(name="paint")
    co = [v.co for v in me.vertices]
    cache = {}
    data = [0.0] * (2 * len(me.loops))
    for poly in me.polygons:
        tubes = tubes_by_zone[me.materials[poly.material_index].name]
        c = poly.center
        tube = min(tubes, key=lambda tb: (c - tb.c[tb.kd.find(c)[1]]).length - tb.radius[tb.kd.find(c)[1]])
        uvs = []
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            key = (vi, tube.name)
            if key not in cache:
                cache[key] = tube.uv(co[vi])
            uvs.append(cache[key])
        us = [u for u, _ in uvs]
        wrap = max(us) - min(us) > 0.5
        for li, (u, v) in zip(poly.loop_indices, uvs):
            data[2 * li] = u + 1.0 if wrap and u < 0.5 else u
            data[2 * li + 1] = v
    uvl.data.foreach_set("uv", data)
    me.uv_layers.active = uvl


# ---------------------------------------------------------------- export
def principled(name, color, metallic, roughness):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs[0])
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m


def decimate(ob, tris):
    n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if n <= tris:
        return
    mod = ob.modifiers.new("decimate", "DECIMATE")
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = tris / n
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objs, name, material):
    for o in objs:
        o.parent = None            # wheel empties sit at the origin
        o.data.materials.clear()
        o.data.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    ob.name = ob.data.name = name
    return ob


def export_variant(variant):
    clear_scene()
    fns = load("build_frame.py", VARIANT=variant)
    K = fns["KEY"]
    frame, fork = fns["build"](voxel=VOXEL, fillet=FILLET, band=BAND, smooth=SMOOTH)
    paint_uvs(frame, fns["SECTIONS"])
    paint_uvs(fork, fns["SECTIONS"])
    decimate(frame, FRAME_TRIS)
    decimate(fork, FORK_TRIS)

    # one object per zone
    zones = []
    for ob in (frame, fork):
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='MATERIAL')
        bpy.ops.object.mode_set(mode='OBJECT')
    for ob in [o for o in bpy.data.objects if o.name.startswith(("Frame", "Fork"))]:
        me = ob.data
        mat = me.materials[me.polygons[0].material_index]
        me.materials.clear()
        me.materials.append(mat)
        me.polygons.foreach_set("material_index", [0] * len(me.polygons))
        ob.name = me.name = f"zone_{mat.name}"
        zones.append(ob)
        principled(mat.name, (0.5, 0.5, 0.5), 0.0, 0.5)   # plain stand-in: the app paints the zones

    # hardware from the wheel builder: rotors + thru-axles only
    load("build_wheels.py")["build"](K)
    steel = principled("hw_steel", (0.62, 0.63, 0.65), 1.0, 0.3)
    black = principled("hw_black", (0.02, 0.02, 0.022), 0.5, 0.42)
    objs = {o.name: o for o in bpy.data.objects}
    hw = [join([objs[f"{w}Rotor{p}"] for w in ("Front", "Rear") for p in ("Ring", "Arms")], "hw_steel", steel),
          join([objs[f"{w}{p}"] for w in ("Front", "Rear")
                for p in ("RotorCarrier", "RotorLockring", "AxleHead", "AxleNut")], "hw_black", black)]

    web = lambda v: [round(v.x, 5), round(v.z, 5), round(-v.y, 5)]
    sc = bpy.context.scene
    sc["frontHub"] = web(K["front_hub"])
    sc["rearHub"] = web(K["rear_hub"])
    sc["wheelRadius"] = K["WHEEL_R"]
    sc["tireWidth"] = K["TIRE_W"]
    sc["hubHalfFront"] = K["HALF_FRONT"] - K["DROP_HALF_FRONT"]
    sc["hubHalfRear"] = K["HALF_REAR"] - K["DROP_HALF_REAR"]

    # glTF stores V flipped (1 - v) and three.js keeps it as is: pre-flip so the
    # app sees v = 0 at the tube start, like its old procedural tubes.
    for o in zones:
        uv = o.data.uv_layers["paint"].data
        flat = [0.0] * (2 * len(uv))
        uv.foreach_get("uv", flat)
        flat[1::2] = [1.0 - v for v in flat[1::2]]
        uv.foreach_set("uv", flat)

    bpy.ops.object.select_all(action='DESELECT')
    for o in zones + hw:
        o.select_set(True)
    path = os.path.join(OUT, f"bike_{variant}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_extras=True, export_normals=True,
                              export_texcoords=True, export_tangents=False, export_materials='EXPORT',
                              export_vertex_color='NONE', export_attributes=False, export_cameras=False,
                              export_lights=False, export_animations=False,
                              export_meshopt_compression_enable=True)  # lossless; drei decodes it
    for k in ("frontHub", "rearHub", "wheelRadius", "tireWidth", "hubHalfFront", "hubHalfRear"):
        del sc[k]
    return {"file": path, "bytes": os.path.getsize(path),
            "zones": {o.name: len(o.data.polygons) for o in zones}}


report = {v: export_variant(v) for v in VARIANTS}
