import math
EPS=.00002
def bb(ps):return [[min(v[k] for v in ps) for k in range(3)],[max(v[k] for v in ps) for k in range(3)]]
def hull(ps):
 q=sorted(set((round(p.x,7),round(p.y,7)) for p in ps))
 if len(q)<=2:return q
 cross=lambda o,a,b:(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 a=[];b=[]
 for p in q:
  while len(a)>1 and cross(a[-2],a[-1],p)<=0:a.pop()
  a.append(p)
 for p in q[::-1]:
  while len(b)>1 and cross(b[-2],b[-1],p)<=0:b.pop()
  b.append(p)
 return a[:-1]+b[:-1]
def sat(a,b):
 for p in [a,b]:
  for i,x in enumerate(p):
   y=p[(i+1)%len(p)];dx=y[0]-x[0];dy=y[1]-x[1];L=math.hypot(dx,dy)
   if L<1e-9:continue
   ux=-dy/L;uy=dx/L
   aa=[v[0]*ux+v[1]*uy for v in a];bb=[v[0]*ux+v[1]*uy for v in b]
   if min(max(aa),max(bb))-max(min(aa),min(bb))<=EPS:return False
 return True
def row(o,ps):return dict(name=o.name,bb=bb(ps),hull=hull(ps))
def collision(a,b):
 if any(min(a['bb'][1][k],b['bb'][1][k])-max(a['bb'][0][k],b['bb'][0][k])<=EPS for k in range(3)):return False
 return sat(a['hull'],b['hull'])
def inside(p,poly):
 x,y=p;odd=False
 for i,a in enumerate(poly):
  b=poly[(i+1)%len(poly)];dx=b[0]-a[0];dy=b[1]-a[1];ll=dx*dx+dy*dy
  t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/ll))
  if math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<EPS:return True
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:odd=not odd
 return odd
