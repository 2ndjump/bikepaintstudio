"""Carbon materials (procedural 3K twill image, box-projected, gloss clearcoat),
tire/hub/rotor materials and a simple studio: cyclorama, softbox key, fill,
overhead strip + two rim strips, cameras. Cycles."""
import bpy, math
import numpy as np
from mathutils import Vector

ZONES = ["headTube", "topTube", "downTube", "seatTube", "seatStays", "chainStays", "fork", "frontRim", "rearRim"]

# ---------------------------------------------------------------- 3K twill weave texture
def weave_image(size=1024, tows=16):
    img = bpy.data.images.get("CarbonTwill")
    if img:
        bpy.data.images.remove(img)
    cell = size // tows
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    i, j = (x // cell).astype(int), (y // cell).astype(int)
    fx, fy = (x % cell) / cell, (y % cell) / cell
    warp = ((i - j) % 4) < 2                      # 2/2 twill
    across = np.where(warp, fx, fy)               # coordinate across the tow
    along = np.where(warp, fy, fx)
    crown = np.sin(np.pi * across) ** 0.6         # rounded tow
    rng = np.random.default_rng(3)
    streak = rng.random(size).astype(np.float32)
    fib = np.where(warp, streak[x.astype(int)], streak[y.astype(int)])
    edge = np.clip(np.minimum(along, 1 - along) * 6, 0, 1)
    height = crown * (0.75 + 0.25 * edge)
    # tone: warp vs weft tows catch light differently (fake anisotropy)
    tone = np.where(warp, 0.030, 0.012) * (0.45 + 0.55 * crown) * (0.8 + 0.4 * fib)
    rgba = np.zeros((size, size, 4), np.float32)
    rgba[..., 0] = tone
    rgba[..., 1] = tone * 1.02
    rgba[..., 2] = tone * 1.08
    rgba[..., 3] = height                         # height stored in alpha
    img = bpy.data.images.new("CarbonTwill", size, size, alpha=True, float_buffer=True)
    img.colorspace_settings.name = "Non-Color"
    img.alpha_mode = 'CHANNEL_PACKED'
    img.pixels.foreach_set(rgba.ravel())   # set pixels last: settings changes reset the buffer
    img.update()
    img.pack()
    return img

def carbon_group(img):
    ng = bpy.data.node_groups.get("CarbonShader")
    if ng:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new("CarbonShader", "ShaderNodeTree")
    ng.interface.new_socket("BSDF", in_out="OUTPUT", socket_type="NodeSocketShader")
    s = ng.interface.new_socket("Coat Roughness", in_out="INPUT", socket_type="NodeSocketFloat")
    s.default_value = 0.04
    s = ng.interface.new_socket("Weave Scale", in_out="INPUT", socket_type="NodeSocketFloat")
    s.default_value = 32.0
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput")
    go = N.new("NodeGroupOutput")
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    comb = N.new("ShaderNodeCombineXYZ")
    for k in "XYZ":
        L.new(gi.outputs["Weave Scale"], comb.inputs[k])
    L.new(comb.outputs[0], mp.inputs["Scale"])
    tex = N.new("ShaderNodeTexImage")
    tex.image = img
    tex.projection = 'BOX'
    tex.projection_blend = 0.35
    tex.interpolation = 'Cubic'
    L.new(mp.outputs[0], tex.inputs["Vector"])
    bsdf = N.new("ShaderNodeBsdfPrincipled")
    L.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    rough = N.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.45
    rough.inputs["To Max"].default_value = 0.28
    L.new(tex.outputs["Alpha"], rough.inputs["Value"])
    L.new(rough.outputs[0], bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Coat Weight"].default_value = 1.0
    bsdf.inputs["Coat IOR"].default_value = 1.5
    L.new(gi.outputs["Coat Roughness"], bsdf.inputs["Coat Roughness"])
    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.0002
    L.new(tex.outputs["Alpha"], bump.inputs["Height"])
    L.new(bump.outputs[0], bsdf.inputs["Normal"])     # weave under the coat, coat stays smooth
    L.new(bsdf.outputs[0], go.inputs[0])
    return ng

def make_mat(name, build):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    sh = build(nt)
    nt.links.new(sh, out.inputs["Surface"])
    return m

def principled(nt, color, rough, metal=0.0, coat=0.0):
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    return b

def materials():
    img = weave_image()
    ng = carbon_group(img)
    for z in ZONES:
        def build(nt, z=z):
            g = nt.nodes.new("ShaderNodeGroup")
            g.node_tree = ng
            if z.endswith("Rim"):
                g.inputs["Coat Roughness"].default_value = 0.18   # satin rims
            return g.outputs[0]
        m = make_mat(z, build)
        m.diffuse_color = (0.03, 0.03, 0.035, 1)

    def tread(nt):
        b = principled(nt, (0.018, 0.018, 0.018), 0.75)
        tc = nt.nodes.new("ShaderNodeTexCoord")
        vor = nt.nodes.new("ShaderNodeTexVoronoi")
        vor.inputs["Scale"].default_value = 260
        nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.6
        bump.inputs["Distance"].default_value = 0.0015
        bump.invert = True
        nt.links.new(vor.outputs["Distance"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], b.inputs["Normal"])
        return b.outputs[0]
    make_mat("Tire_Tread", tread)
    make_mat("Tire_Sidewall", lambda nt: principled(nt, (0.42, 0.27, 0.13), 0.7).outputs[0])
    make_mat("Hub", lambda nt: principled(nt, (0.02, 0.02, 0.02), 0.35, 0.6).outputs[0])
    make_mat("Spokes", lambda nt: principled(nt, (0.015, 0.015, 0.015), 0.45, 0.5).outputs[0])
    def rotor_steel(nt):
        # circumferentially brushed stainless (objects have their origin on the axle, local Z = axle)
        b = principled(nt, (0.62, 0.62, 0.63), 0.30, 1.0)
        b.inputs["Anisotropic"].default_value = 0.75
        tg = nt.nodes.new("ShaderNodeTangent")
        tg.direction_type = 'RADIAL'
        tg.axis = 'Z'
        nt.links.new(tg.outputs[0], b.inputs["Tangent"])
        return b.outputs[0]
    make_mat("Rotor", rotor_steel)

# ---------------------------------------------------------------- studio
def cyclorama():
    import bmesh
    bm = bmesh.new()
    prof = []
    floor_back, R, wall_top, front = 1.2, 1.4, 5.0, -6.0
    prof.append((front, 0.0))
    for k in range(10):
        prof.append((front + (floor_back - front) * k / 10, 0.0))
    for k in range(25):
        a = math.pi / 2 * k / 24
        prof.append((floor_back + math.sin(a) * R, R - math.cos(a) * R))
    prof.append((floor_back + R, wall_top))
    xs = [-7.0 + 14.0 * i / 20 for i in range(21)]
    grid = [[bm.verts.new((x, y, z)) for (y, z) in prof] for x in xs]
    for a, b in zip(grid, grid[1:]):
        for j in range(len(prof) - 1):
            f = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("Cyclorama")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Cyclorama", me)
    m = make_mat("Studio_Backdrop", lambda nt: principled(nt, (0.035, 0.036, 0.04), 0.55).outputs[0])
    me.materials.append(m)
    return ob

def area(name, size, loc, target, energy, shape='RECTANGLE', size_y=None, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.energy = energy
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    d = (Vector(target) - Vector(loc)).normalized()
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob

def camera(name, loc, target, lens):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    ob = bpy.data.objects.new(name, cd)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob

def studio(center=(0.09, 0.0, 0.42)):
    coll = bpy.data.collections.get("Studio") or bpy.data.collections.new("Studio")
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    for o in list(coll.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    objs = [cyclorama(),
            area("Key_Softbox", 1.6, (-1.2, -2.6, 2.0), center, 260, size_y=1.1),
            area("Fill", 2.5, (2.6, -2.2, 0.8), center, 50, size_y=1.5),
            area("Top_Strip", 3.0, (0.1, -0.6, 2.6), center, 140, size_y=0.35),
            area("Rim_Left", 0.35, (-2.6, 1.6, 1.4), center, 160, size_y=2.2),
            area("Rim_Right", 0.35, (2.8, 1.6, 1.4), center, 160, size_y=2.2),
            camera("Cam_Side", (0.09, -3.9, 0.55), center, 60),
            camera("Cam_34", (2.0, -2.6, 1.05), (0.12, 0, 0.42), 55),
            camera("Cam_Detail_Head", (0.95, -0.75, 0.85), (0.42, 0, 0.63), 70),
            camera("Cam_Detail_BB", (0.35, -0.8, 0.45), (-0.08, 0, 0.3), 70),
            camera("Cam_Detail_BB_Under", (0.25, -0.55, 0.12), (-0.02, 0, 0.27), 60),
            camera("Cam_Detail_Seat", (-0.55, -0.75, 0.95), (-0.15, 0, 0.78), 70),
            camera("Cam_Detail_ForkTip", (0.85, -0.45, 0.42), (0.61, 0, 0.36), 80),
            camera("Cam_Detail_Rear", (-0.6, -0.6, 0.5), (-0.40, 0, 0.38), 70),
            camera("Cam_Detail_Rotor", (0.80, 0.60, 0.48), (0.61, 0.045, 0.35), 70),
            camera("Cam_Front", (2.6, -0.35, 0.55), (0.3, 0, 0.45), 85)]
    for o in objs:
        coll.objects.link(o)
    sc = bpy.context.scene
    sc.camera = bpy.data.objects["Cam_Side"]
    w = sc.world or bpy.data.worlds.new("World")
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.008, 0.008, 0.009, 1)
    bg.inputs["Strength"].default_value = 1.0
    r = sc.render
    r.engine = 'CYCLES'
    sc.cycles.samples = 128
    sc.cycles.use_denoising = True
    r.resolution_x, r.resolution_y = 1920, 1080
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - High Contrast'
    sc.view_settings.exposure = -0.2
