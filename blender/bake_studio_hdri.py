"""Bake the studio (build_studio.py) into an equirectangular HDR environment for
the web app: public/assets/hdri/studio_2k.hdr (+ a tone-mapped preview PNG in
screenshots/renderquality/).
Usage: blender --background --factory-startup --python blender/bake_studio_hdri.py

Same rig as the Blender studio, in the web app's bright look: the cyclorama is
painted white (#f6f7f9, as BACKDROP_COLOR in StudioEnvironment.tsx) and the five
area lights become one-sided emissive panels of the same size, placement and
radiance (energy / (pi * area)), so they show up as crisp HDR shapes. Rendered
with Cycles from the bike's centre (the lights' target), without the bike.

Orientation: the panorama camera looks along Blender +X with +Z up, which is
exactly three.js' equirect convention with web = (bx, bz, -by): image centre
column = web +X (bike forward), 3/4 width = web +Z (the side camera / drive
side), 1/4 width = web -Z (back wall), top row = up. Values are linear and
scaled so the back wall behind the bike reads about 1.0.
"""
import bpy, math, os
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else r"C:\Users\Jannes\Documents\repo\bike frame designer\blender"
REPO = os.path.normpath(os.path.join(HERE, ".."))
OUT = os.path.join(REPO, "public", "assets", "hdri", "studio_2k.hdr")
PREVIEW = os.path.join(REPO, "screenshots", "renderquality", "studio_2k_preview.png")
W, H, SAMPLES = 2048, 1024, 512
CENTER = Vector((0.09, 0.0, 0.42))          # studio(center): what the lights aim at
BACKDROP = (0.922, 0.930, 0.947)            # #f6f7f9, linear
EXPOSURE = 0.30                             # back wall at the horizon -> ~1.0
WORLD = 0.3                                 # open front / ceiling (~0.1 after EXPOSURE)

ns = {"__file__": os.path.join(HERE, "build_studio.py")}
exec(compile(open(ns["__file__"]).read(), "build_studio.py", "exec"), ns)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
ns["studio"](tuple(CENTER))
sc = bpy.context.scene
coll = bpy.data.collections["Studio"]

bsdf = bpy.data.materials["Studio_Backdrop"].node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (*BACKDROP, 1)
bsdf.inputs["Roughness"].default_value = 0.9


def panel_material(name, strength):
    """Emissive front (local -Z, like an area light), dark housing behind."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    back = nt.nodes.new("ShaderNodeBsdfDiffuse")
    back.inputs["Color"].default_value = (0.02, 0.02, 0.02, 1)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mix.inputs[0])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(back.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs[0])
    return m


panels = {}                                 # name -> (location, radiance)
for ob in [o for o in coll.objects if o.type in ('LIGHT', 'CAMERA')]:
    if ob.type == 'LIGHT':
        ld = ob.data
        w, h = ld.size, ld.size_y
        panels[ob.name] = (ob.location.copy(), EXPOSURE * ld.energy / (math.pi * w * h))
        me = bpy.data.meshes.new(ob.name + "_panel")
        # wound so the face normal is local -Z, the area light's emitting side
        me.from_pydata([(-w / 2, -h / 2, 0), (-w / 2, h / 2, 0), (w / 2, h / 2, 0), (w / 2, -h / 2, 0)], [], [(0, 1, 2, 3)])
        me.materials.append(panel_material(ob.name + "_panel", panels[ob.name][1]))
        panel = bpy.data.objects.new(ob.name + "_panel", me)
        panel.location, panel.rotation_euler = ob.location, ob.rotation_euler
        coll.objects.link(panel)
    bpy.data.objects.remove(ob, do_unlink=True)

sc.world.node_tree.nodes["Background"].inputs["Color"].default_value = (WORLD * EXPOSURE,) * 3 + (1,)

cd = bpy.data.cameras.new("Pano")
cd.type = 'PANO'
cd.panorama_type = 'EQUIRECTANGULAR'
cam = bpy.data.objects.new("Pano", cd)
sc.collection.objects.link(cam)
cam.location = CENTER
cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)    # look along +X, +Z up
sc.camera = cam

sc.render.engine = 'CYCLES'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.0
sc.render.image_settings.file_format = 'HDR'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)

# Read the file back: stats and a tone-mapped preview.
img = bpy.data.images.load(OUT)
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)[::-1, :, :3]    # row 0 = top
lum = px @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def pixel(d):
    """Image (column, row) of a Blender direction, three.js equirect convention."""
    x, y, z = d.x, d.z, -d.y          # web direction
    u = math.atan2(z, x) / (2 * math.pi) + 0.5
    v = math.asin(y / d.length) / math.pi + 0.5
    return u * W, (1 - v) * H


print("HDRI file", OUT, os.path.getsize(OUT), "bytes")
print("HDRI back wall (Blender +Y, horizon)", lum[H // 2, W // 4], " floor below", lum[H - 2, W // 2], " max", lum.max())
rows, cols = np.mgrid[0:H, 0:W]
for name, (loc, rad) in panels.items():
    c, r = pixel(loc - CENTER)
    dc = (cols - c + W / 2) % W - W / 2                       # wrap-aware column offset
    mask = (lum > 0.7 * rad) & (np.abs(dc) < W / 8) & (np.abs(rows - r) < H / 6)
    print(f"HDRI {name}: radiance {rad:.2f}; centre expected at col {c:.0f} row {r:.0f}, "
          f"bright pixels centred at col {(c + dc[mask].mean()) % W:.0f} row {rows[mask].mean():.0f} "
          f"(cols {(c + dc[mask].min()) % W:.0f}..{(c + dc[mask].max()) % W:.0f}, rows {rows[mask].min()}..{rows[mask].max()})")

tm = px / (1 + px)                                       # Reinhard, then sRGB
tm = np.where(tm <= 0.0031308, 12.92 * tm, 1.055 * np.power(tm, 1 / 2.4) - 0.055)
small = tm.reshape(H // 2, 2, W // 2, 2, 3).mean(axis=(1, 3))
prev = bpy.data.images.new("preview", W // 2, H // 2)
prev.pixels.foreach_set(np.concatenate([small[::-1], np.ones((H // 2, W // 2, 1))], axis=2).astype(np.float32).ravel())
os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)
prev.filepath_raw = PREVIEW
prev.file_format = 'PNG'
prev.save()
