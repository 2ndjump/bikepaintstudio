"""Rebuild the whole scene. In Blender: exec(open(r"<repo>/blender/run_all.py").read())
or `blender --python blender/run_all.py`."""
import bpy, os

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else r"C:\Users\Jannes\Documents\repo\bike frame designer\blender"

def load(name):
    ns = {"__file__": os.path.join(HERE, name)}
    exec(compile(open(ns["__file__"]).read(), name, "exec"), ns)
    return ns

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.lights, bpy.data.cameras):
    for d in list(coll):
        coll.remove(d)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

frame_ns = load("build_frame.py")
frame, fork = frame_ns["build"](voxel=0.0008, fillet=20, band=16, smooth=4)
bike = bpy.data.collections.new("Bike")
bpy.context.scene.collection.children.link(bike)
for o in (frame, fork):
    bpy.context.scene.collection.objects.unlink(o)
    bike.objects.link(o)
load("build_wheels.py")["build"](frame_ns["KEY"])
studio = load("build_studio.py")
studio["materials"]()
studio["studio"]()
