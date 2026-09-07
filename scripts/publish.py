#!/usr/bin/env python3
"""Publish a scene using the existing viewer bundle, without rebuilding the app."""
import argparse,fcntl,hashlib,json,os,re,shutil,subprocess,tempfile,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
REPO='https://github.com/clairefairchild/rmb-model-viewer.git'
URL='https://models.ronismacbar.com'
def run(args,**kwargs):return subprocess.run([str(a) for a in args],check=True,**kwargs)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(p,data):
 p.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(mode='w',dir=p.parent,delete=False) as f:f.write(data);tmp=f.name
 os.replace(tmp,p)
def routes():
 site=ROOT/'site';html=(site/'index.html').read_text()
 manifest=json.loads((site/'projects.json').read_text())
 for project in manifest['projects']:
  target=site/project['slug']/'index.html';atomic(target,html.replace('./assets/','../assets/'))
 equipment_path=site/'equipment.json'
 if equipment_path.exists():
  equipment=json.loads(equipment_path.read_text())
  atomic(site/'equipment'/'index.html',html.replace('./assets/','../assets/'))
  for item in equipment['equipment']:
   atomic(site/'equipment'/item['slug']/'index.html',html.replace('./assets/','../../assets/'))
 atomic(site/'404.html',html.replace('./assets/',URL+'/assets/'))
 atomic(site/'.nojekyll','')
def verify_deployment():
 expected=(ROOT/'site/index.html').read_bytes();deadline=time.time()+300
 while time.time()<deadline:
  try:
   with urllib.request.urlopen(URL+'/?publication='+str(time.time_ns()),timeout=20) as response:
    if response.status!=200 or response.read()!=expected:raise RuntimeError('Previous viewer build is still live')
   with urllib.request.urlopen(URL+'/projects.json?publication='+str(time.time_ns()),timeout=20) as response:
    if json.load(response)!=json.loads((ROOT/'site/projects.json').read_text()):raise RuntimeError('Previous catalog is still live')
   for project in json.loads((ROOT/'site/projects.json').read_text())['projects']:
    with urllib.request.urlopen(URL+'/'+project['slug']+'/?publication='+str(time.time_ns()),timeout=20) as response:
     if response.status!=200 or response.read()!=(ROOT/'site'/project['slug']/'index.html').read_bytes():raise RuntimeError('Project route is still updating')
    with urllib.request.urlopen(URL+'/'+project['asset'],timeout=30) as response:
     if response.status!=200 or response.headers.get_content_type()!='model/gltf-binary' or hashlib.sha256(response.read()).hexdigest()!=project['sha256']:raise RuntimeError('Model readback failed')
   equipment_path=ROOT/'site/equipment.json'
   if equipment_path.exists():
    equipment=json.loads(equipment_path.read_text())
    with urllib.request.urlopen(URL+'/equipment.json?publication='+str(time.time_ns()),timeout=20) as response:
     if json.load(response)!=equipment:raise RuntimeError('Previous equipment catalog is still live')
    with urllib.request.urlopen(URL+'/equipment/?publication='+str(time.time_ns()),timeout=20) as response:
     if response.status!=200 or response.read()!=(ROOT/'site/equipment/index.html').read_bytes():raise RuntimeError('Equipment library route is still updating')
    for item in equipment['equipment']:
     with urllib.request.urlopen(URL+'/equipment/'+item['slug']+'/?publication='+str(time.time_ns()),timeout=20) as response:
      if response.status!=200 or response.read()!=(ROOT/'site/equipment'/item['slug']/'index.html').read_bytes():raise RuntimeError('Equipment route is still updating')
     with urllib.request.urlopen(URL+'/'+item['asset'],timeout=30) as response:
      asset_bytes=response.read()
      if response.status!=200 or response.headers.get_content_type()!='model/gltf-binary' or len(asset_bytes)!=item['sizeBytes'] or hashlib.sha256(asset_bytes).hexdigest()!=item['sha256']:raise RuntimeError('Equipment model readback failed')
   print('LIVE_DEPLOYMENT_VERIFIED');return
  except Exception as error:
   last_error=type(error).__name__+': '+str(error);time.sleep(5)
 raise RuntimeError('Upload finished, but live verification is pending: '+last_error)
def deploy():
 routes()
 with tempfile.TemporaryDirectory(prefix='rmb-model-deploy-') as folder:
  target=Path(folder)
  exists=subprocess.run(['git','ls-remote','--exit-code','--heads',REPO,'gh-pages'],capture_output=True).returncode==0
  if exists:run(['git','clone','--quiet','--depth','1','--branch','gh-pages',REPO,target])
  else:
   run(['git','init','-b','gh-pages',target]);run(['git','-C',target,'remote','add','origin',REPO])
  # Preserve historical hashed models/bundles so previously open tabs keep working.
  shutil.copytree(ROOT/'site',target,dirs_exist_ok=True)
  run(['git','-C',target,'add','--all'])
  changed=subprocess.run(['git','-C',target,'diff','--cached','--quiet']).returncode!=0
  if changed:
   run(['git','-C',target,'-c','user.name=Roni’s Model Studio','-c','user.email=clairefairchild@users.noreply.github.com','commit','-m','Publish model catalog and static viewer'])
   run(['git','-C',target,'push','origin','gh-pages'])
 verify_deployment()
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('scene',nargs='?',help='.blend file or project directory containing scene.blend');p.add_argument('--slug');p.add_argument('--title');p.add_argument('--revision',default='Design model');p.add_argument('--description',default='An interactive first look at this space.');p.add_argument('--thumbnail',type=Path);p.add_argument('--replace',action='store_true');p.add_argument('--deploy',action='store_true');p.add_argument('--deploy-only',action='store_true');p.add_argument('--routes-only',action='store_true');args=p.parse_args()
 with open(ROOT/'.publish.lock','w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  if args.routes_only:routes();print('STATIC_ROUTES_GENERATED');raise SystemExit(0)
  if args.deploy_only:deploy();print(URL);raise SystemExit(0)
  if not args.scene or not args.slug or not args.title:p.error('scene, --slug, and --title are required')
  if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',args.slug) or args.slug in {'assets','models','index','projects'}:p.error('Use a safe lowercase hyphenated project slug')
  source=Path(args.scene).resolve();source=source/'scene.blend' if source.is_dir() else source
  if source.suffix!='.blend' or not source.is_file():p.error('Source .blend does not exist')
  if not (ROOT/'site/index.html').exists():p.error('Run npm run build once before publishing')
  manifest=json.loads((ROOT/'public/projects.json').read_text())
  if any(x['slug']==args.slug for x in manifest['projects']) and not args.replace:p.error('Slug already exists; use --replace for an intentional revision')
  original=digest(source)
  with tempfile.TemporaryDirectory(prefix='rmb-model-export-') as tmp:
   out=Path(tmp)/'model.glb';report=Path(tmp)/'export.json'
   evidence=ROOT/'evidence';evidence.mkdir(exist_ok=True)
   try:
    with open(evidence/(args.slug+'-blender.log'),'w') as log:run([BLENDER,'--background','--factory-startup',source,'--python-exit-code','1','--python',ROOT/'scripts/export_blend.py','--',out,report],stdout=log,stderr=subprocess.STDOUT,timeout=600)
   finally:
    if digest(source)!=original:raise RuntimeError('SOURCE HASH CHANGED: publication stopped')
   with open(evidence/(args.slug+'-validation.json'),'w') as log:run(['node',ROOT/'scripts/validate-glb.mjs',out],stdout=log,timeout=120)
   if out.stat().st_size>=100*1024*1024:raise RuntimeError('GLB exceeds the GitHub 100 MiB file limit; optimize before publishing')
   version=digest(out)[:12];asset=f'models/{args.slug}/{version}.glb'
   for base in [ROOT/'public',ROOT/'site']:
    dest=base/asset;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(out,dest)
   record={'slug':args.slug,'title':args.title,'revision':args.revision,'description':args.description,'asset':asset,'sizeBytes':out.stat().st_size,'sha256':digest(out),'disclaimer':'Explicit-design first pass · Not construction documents or verified as-built.'}
   if args.thumbnail:
    suffix=args.thumbnail.suffix.lower()
    if suffix not in {'.png','.jpg','.jpeg','.webp'}:p.error('Thumbnail must be PNG/JPEG/WebP')
    thumb=f'models/{args.slug}/preview-{digest(args.thumbnail)[:12]}{suffix}';record['thumbnail']=thumb
    for base in [ROOT/'public',ROOT/'site']:shutil.copy2(args.thumbnail,base/thumb)
   manifest['projects']=[record if x['slug']==args.slug else x for x in manifest['projects']]
   if not any(x['slug']==args.slug for x in manifest['projects']):manifest['projects'].append(record)
   for base in [ROOT/'public',ROOT/'site']:atomic(base/'projects.json',json.dumps(manifest,indent=2)+'\n')
   proof=json.loads(report.read_text());proof.update({'sourceSha256':original,'sourcePreserved':True,'assetSha256':digest(out),'slug':args.slug});atomic(evidence/(args.slug+'-export.json'),json.dumps(proof,indent=2)+'\n')
  routes()
  if args.deploy:deploy()
  print(json.dumps({'url':URL+'/'+args.slug+'/','providerUrlRedirectsToCustomDomain':'https://clairefairchild.github.io/rmb-model-viewer/'+args.slug+'/','asset':asset,'sizeBytes':record['sizeBytes'],'deployed':args.deploy},indent=2))
