/* Scientific explainer. Data are copied from the paper's figure source files.
   The code example is illustrative pseudocode, not an individual scored run. */
(() => {
  const canvas = document.querySelector('#harness-animation');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stage = canvas.closest('.animation-stage');
  const play = document.querySelector('.motion-toggle');
  const replay = document.querySelector('.motion-replay');
  const slider = document.querySelector('.animation-timeline');
  const clock = document.querySelector('.animation-time');
  const heading = document.querySelector('#scene-title');
  const caption = document.querySelector('.animation-caption');
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 39;
  const starts = [0, 12, 27];
  const titles = ['Learn from execution outcomes', 'Change how evidence reaches the answer', 'Carry the revision skill to unseen tasks'];
  const captions = [
    'During training, revised harnesses run the frozen solver on task questions. Their performance supplies the reward for updating the proposer.',
    'A learned QA revision keeps summaries for guiding retrieval, but gives the answering call the original passages. At test time, both models stay fixed.',
    'Training improves individual revisions on unseen reasoning families. In QA, a separately trained proposer continues improving harnesses over successive rounds.'
  ];
  // fig_single_step_main.json: mean and SE across 21 unseen families.
  const reasoning = [{name:'Base', value:.3168395977, se:.0569708368}, {name:'Trained', value:.6232596755, se:.0594505295}];
  // fig_qa_main.json: MuSiQue mean across four revision chains, rounds 0–10.
  const qaBase = [.1426978754,.0877926328,.1028428037,.1421404643,.1613712363,.1505016664,.1914715781,.1421404643,.1446488321,.1287625267,.1379598633];
  const qaRL = [.1426978754,.1897993270,.2090300990,.2449832752,.2424749252,.2474916429,.2658862804,.2658862804,.2734113659,.2608695627,.2675585316];
  const c = {ink:'#193b4b', red:'#b9233d', muted:'#71828a', faint:'#e1e8eb', gray:'#9aabb3', wash:'#f5f8f9', rose:'#fcf1f3', white:'#ffffff'};
  let width=1000, height=445, mobile=false, time=reduced.matches?11.5:0, previous=0, frame=0, playing=!reduced.matches, visible=false, current=-1;
  const clamp = n => Math.max(0,Math.min(1,n));
  const ease = n => { n=clamp(n); return n*n*(3-2*n); };
  const progress = (t,a,b) => ease((t-a)/(b-a));
  function text(value,x,y,size=15,color=c.ink,align='left',weight=400,font='sans') {
    ctx.fillStyle=color;
    ctx.font=`${weight} ${size}px ${font==='mono'?'Consolas, monospace':"'Segoe UI', Arial, sans-serif"}`;
    ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(value,x,y);
  }
  function line(points,color=c.faint,lw=1.5,amount=1,dash=[]) {
    if (amount<=0) return;
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    let remaining=lengths.reduce((a,b)=>a+b,0)*clamp(amount);
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for(let i=0;i<lengths.length;i++) {
      const f=Math.min(1,remaining/lengths[i]);
      ctx.lineTo(points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f);
      remaining-=lengths[i]; if(remaining<=0) break;
    }
    ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
  }
  function arrow(points,color=c.gray,amount=1,lw=1.6) {
    line(points,color,lw,amount);
    if(amount<.99) return;
    const p=points.at(-1),q=points.at(-2),a=Math.atan2(p[1]-q[1],p[0]-q[0]);
    line([[p[0]-7*Math.cos(a-.45),p[1]-7*Math.sin(a-.45)],p,[p[0]-7*Math.cos(a+.45),p[1]-7*Math.sin(a+.45)]],color,lw);
  }
  function box(x,y,w,h,title,subtitle='',accent=false) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,7);ctx.fillStyle=accent?c.rose:c.wash;ctx.fill();ctx.strokeStyle=accent?c.red:c.faint;ctx.lineWidth=1.2;ctx.stroke();
    text(title,x+w/2,y+h/2-(subtitle?9:0),mobile?14:16,accent?c.red:c.ink,'center',600);
    if(subtitle) text(subtitle,x+w/2,y+h/2+14,mobile?12:13,c.muted,'center');
  }
  function fade(amount,fn) {ctx.save();ctx.globalAlpha*=clamp(amount);fn();ctx.restore();}
  function dot(x,y,color=c.red,r=4) {ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function particle(points,p,color=c.red) {
    const lengths=points.slice(1).map((q,i)=>Math.hypot(q[0]-points[i][0],q[1]-points[i][1]));
    let rem=lengths.reduce((a,b)=>a+b,0)*clamp(p);
    for(let i=0;i<lengths.length;i++) {
      if(rem<=lengths[i]) {const f=rem/lengths[i];dot(points[i][0]+(points[i+1][0]-points[i][0])*f,points[i][1]+(points[i+1][1]-points[i][1])*f,color);break;}
      rem-=lengths[i];
    }
  }
  function training(t) {
    const x=mobile?16:28, w=mobile?width-32:width-56;
    text('TRAINING',x,25,12,c.red,'left',600);
    text('Only the proposer is updated',mobile?x:width-28,mobile?48:25,13,c.muted,mobile?'left':'right');
    if(mobile) {
      text('Task + current harness + execution report',width/2,86,12,c.muted,'center');
      box(width/2-78,114,156,62,'Proposer','learns to revise',t>8);
      arrow([[width/2,91],[width/2,110]],c.gray,progress(t,0,1));
      arrow([[width/2,180],[width/2,212]],c.gray,progress(t,1,2));
      fade(progress(t,1,3),()=>{
        for(let i=0;i<3;i++){let bx=x+i*(w+10)/3;box(bx,218,(w-20)/3,58,`Edit ${i+1}`);text('{ }',bx+(w-20)/6,298,22,c.gray,'center',400,'mono');}
      });
      arrow([[width/2,313],[width/2,337]],c.gray,progress(t,3,4));
      fade(progress(t,3,5),()=>box(width/2-105,344,210,62,'Run solver + tools','evaluate each harness'));
      arrow([[width/2,411],[width/2,444]],c.gray,progress(t,5,6));
      fade(progress(t,5,7),()=>box(width/2-92,451,184,57,'Task performance','reward for RL'));
      const p=[[width/2-99,480],[8,480],[8,145],[width/2-84,145]];
      arrow(p,c.red,progress(t,7,10),2);
      if(t>7&&t<11)particle(p,clamp((t-7)/3));
      fade(progress(t,9,11),()=>text('Learn a reusable revision skill',width/2,548,15,c.red,'center',600));
    } else {
      const a=width*.19,b=width*.45,d=width*.76;
      text('Revision input',a,96,15,c.ink,'center',600);
      text('Task · harness · report',a,122,14,c.muted,'center');
      box(a-85,176,170,80,'Proposer','learns to revise',t>8);
      arrow([[a,136],[a,169]],c.gray,progress(t,0,1));
      arrow([[a+92,216],[b-88,216]],c.gray,progress(t,1,2));
      fade(progress(t,1,3),()=>{
        text('Candidate harnesses',b,100,15,c.ink,'center',600);
        for(let i=0;i<3;i++) {
          box(b-79,138+i*54,158,44,`{ }   Revision ${i+1}`);
        }
      });
      arrow([[b+86,216],[d-118,216]],c.gray,progress(t,3,4));
      fade(progress(t,3,5),()=>{
        text('Execute on task questions',d,100,15,c.ink,'center',600);
        box(d-110,139,220,67,'Frozen solver + tools');
        arrow([[d,213],[d,234]],c.gray);
      });
      fade(progress(t,5,7),()=>box(d-110,242,220,62,'Task performance','reward for each candidate'));
      const p=[[d,312],[d,358],[a,358],[a,263]];
      arrow(p,c.red,progress(t,7,10),2);
      if(t>7&&t<11)particle(p,clamp((t-7)/3));
      fade(progress(t,8,10),()=>{ctx.fillStyle=c.white;ctx.fillRect(width*.36,345,width*.28,26);text('Reinforcement learning update',width*.5,358,14,c.red,'center',600);});
      fade(progress(t,9,11),()=>text('A reusable revision skill, learned from execution outcomes',width/2,412,16,c.ink,'center',600));
    }
  }
  function codePanel(x,y,w,t) {
    const changed=progress(t,5,7);
    ctx.fillStyle=c.wash;ctx.beginPath();ctx.roundRect(x,y,w,207,6);ctx.fill();
    text('harness.py',x+16,y+22,13,c.muted,'left',500,'mono');
    text('simplified',x+w-14,y+22,11,c.muted,'right');
    line([[x,y+40],[x+w,y+40]],c.faint,1);
    const rows=['p1 = search(question)','s1 = summarize(p1)','p2 = search(next_query(s1))','s2 = summarize(p2)'];
    rows.forEach((row,i)=>{text(`${i+1}`,x+18,y+65+i*25,12,c.gray,'center',400,'mono');text(row,x+38,y+65+i*25,mobile?12:14,c.ink,'left',400,'mono');});
    ctx.fillStyle=`rgba(185,35,61,${.08*changed})`;ctx.fillRect(x+7,y+154,w-14,42);
    text('5',x+18,y+175,12,c.gray,'center',400,'mono');
    text('answer(question,',x+38,y+175,mobile?12:14,c.ink,'left',400,'mono');
    const start=x+38+(mobile?12:14)*.55*17;
    fade(1-changed,()=>text('s1 + s2)',start,y+175,mobile?12:14,c.ink,'left',400,'mono'));
    fade(changed,()=>text('p1 + p2)',start,y+175,mobile?12:14,c.red,'left',600,'mono'));
  }
  function evidence(x,y,w,t) {
    const changed=progress(t,5,9), bw=mobile?108:145, bh=50;
    const left=x, right=x+w-bw, a=left+bw/2,b=right+bw/2;
    text('RETRIEVED EVIDENCE',x,y-24,11,c.muted,'left',600);
    box(left,y,bw,bh,'Passages 1');box(left,y+103,bw,bh,'Passages 2');
    box(right,y,bw,bh,'Summary 1');box(right,y+103,bw,bh,'Summary 2');
    arrow([[left+bw+5,y+25],[right-6,y+25]],c.gray,progress(t,0,1));
    fade(1-.65*changed,()=>arrow([[left+bw+5,y+128],[right-6,y+128]],c.gray,progress(t,1,2)));
    const retrieval=[[b,y+56],[b,y+74],[a,y+74],[a,y+97]];
    arrow(retrieval,c.ink,progress(t,1,3));
    ctx.fillStyle=c.white;ctx.fillRect(x+w/2-47,y+64,94,20);text('next retrieval',x+w/2,y+74,11,c.muted,'center');
    const answerX=x+w/2-76, answerY=y+222;
    box(answerX,answerY,152,52,'Answering call','',changed>.6);
    fade(1-.8*changed,()=>{
      arrow([[right+bw+5,y+25],[x+w+11,y+25],[x+w+11,y+193],[x+w/2+25,y+193],[x+w/2+25,answerY-7]],c.gray,progress(t,2,4));
      arrow([[b,y+159],[b,y+182],[x+w/2+25,y+182]],c.gray,progress(t,2,4));
    });
    const p1=[[left-5,y+25],[x-12,y+25],[x-12,y+195],[x+w/2-25,y+195],[x+w/2-25,answerY-7]];
    const p2=[[a,y+159],[a,y+195],[x+w/2-25,y+195]];
    arrow(p1,c.red,changed,2.3);line(p2,c.red,2.3,changed);
    if(t>6&&t<10)particle(p1,clamp((t-6)/3));
    fade(progress(t,8,10),()=>text('Original passages reach the answer',x+w/2,y+301,mobile?12:14,c.red,'center',600));
  }
  function revision(t) {
    text('TEST TIME',mobile?16:28,25,12,c.red,'left',600);
    text('Proposer + solver weights fixed',mobile?16:width-28,mobile?48:25,13,c.muted,mobile?'left':'right');
    if(mobile) {
      codePanel(12,72,width-24,t);
      evidence(28,327,width-56,t);
    } else {
      const cw=Math.min(405,width*.42), ex=width*.55, ew=width*.39;
      text('One learned change to a QA harness',28,78,16,c.ink,'left',600);
      codePanel(28,109,cw,t);
      fade(progress(t,5,7),()=>{
        text('Summaries still guide retrieval.',44,350,14,c.muted);
        text('Passages now support the final answer.',44,374,14,c.red,'left',600);
      });
      evidence(ex,108,ew,t);
    }
  }
  function axes(x,y,w,h,ticks,max) {
    for(const v of ticks){const yy=y+h-h*v/max;line([[x,yy],[x+w,yy]],c.faint,1);text(v.toFixed(1),x-12,yy,12,c.muted,'right');}
    line([[x,y],[x,y+h],[x+w,y+h]],c.gray,1);
  }
  function reasoningPlot(x,y,w,h,t) {
    text('Unseen reasoning families',x-32,y-45,mobile?16:19,c.ink,'left',600);
    text('Mean single-revision score · 21 families',x-32,y-20,12,c.muted);
    axes(x,y,w,h,[0,.2,.4,.6,.8],.8);
    reasoning.forEach((r,i)=>{
      const p=progress(t,.5+i*.7,2.5+i*.7),bw=w*.24,xx=x+w*(i?.61:.16),v=r.value*p,yy=y+h-h*v/.8;
      ctx.fillStyle=i?c.red:c.gray;ctx.fillRect(xx,yy,bw,y+h-yy);
      if(p>.98){const err=h*r.se/.8,mid=xx+bw/2;line([[mid,yy-err],[mid,yy+err]],c.ink,1.2);line([[mid-5,yy-err],[mid+5,yy-err]],c.ink,1.2);line([[mid-5,yy+err],[mid+5,yy+err]],c.ink,1.2);}
      text(r.value.toFixed(2),xx+bw/2,yy-h*r.se/.8-15,19,i?c.red:c.ink,'center',600);
      text(r.name,xx+bw/2,y+h+22,13,c.muted,'center');
    });
    text('Error bars: SE across families',x+w/2,y+h+51,11,c.muted,'center');
  }
  function qaPlot(x,y,w,h,t) {
    text('Transfer to multi-hop QA',x-32,y-45,mobile?16:19,c.ink,'left',600);
    text('MuSiQue exact match · trained on HotpotQA',x-32,y-20,12,c.muted);
    axes(x,y,w,h,[0,.1,.2,.3],.3);
    for(let r=0;r<=10;r+=2)text(r,x+w*r/10,y+h+20,12,c.muted,'center');
    text('Revision round',x+w/2,y+h+43,12,c.muted,'center');
    const p=progress(t,3,9),upto=p*10;
    [qaBase,qaRL].forEach((values,j)=>{
      const color=j?c.red:c.gray;
      const points=values.map((v,i)=>[x+w*i/10,y+h-h*v/.3]);
      const whole=Math.floor(upto), partial=upto-whole,shown=points.slice(0,whole+1);
      if(whole<10)shown.push([points[whole][0]+w/10*partial,points[whole][1]+(points[whole+1][1]-points[whole][1])*partial]);
      if(shown.length>1)line(shown,color,j?2.7:1.8);
      dot(...shown.at(-1),color,3.5);
      if(p>.98)text(values.at(-1).toFixed(2),x+w-2,points.at(-1)[1]-13,16,color,'right',600);
    });
    line([[x,y+h+69],[x+20,y+h+69]],c.red,2.5);text('Single-step RL',x+27,y+h+69,12,c.ink);
    line([[x+w-65,y+h+69],[x+w-46,y+h+69]],c.gray,2);text('Base',x+w-38,y+h+69,12,c.muted);
    text('Mean across four chains',x+w/2,y+h+91,11,c.muted,'center');
  }
  function results(t) {
    text('GENERALIZATION',mobile?16:28,25,12,c.red,'left',600);
    text('Measured results · separately trained proposers',mobile?16:width-28,mobile?48:25,mobile?11:13,c.muted,mobile?'left':'right');
    if(mobile){reasoningPlot(46,116,width-77,135,t);qaPlot(46,375,width-77,148,t);}
    else {reasoningPlot(66,119,width*.36,213,t);qaPlot(width*.57,119,width*.37,213,t);}
  }
  function getChapter(){return time<12?0:time<27?1:2;}
  function draw() {
    ctx.clearRect(0,0,width,height);
    const chapter=getChapter(), local=time-starts[chapter];
    // Crossfade each chapter's opening; diagrams then build within the chapter.
    ctx.save();ctx.globalAlpha=.35+.65*progress(local,0,.65);
    [training,revision,results][chapter](local);ctx.restore();
    if(chapter!==current){
      current=chapter;heading.textContent=titles[chapter];caption.textContent=captions[chapter];
      chapters.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chapter)));
      stage.dataset.scene=['training','revision','results'][chapter];
    }
    slider.value=time.toFixed(1);
    slider.setAttribute('aria-valuetext',`${Math.floor(time)} seconds. ${titles[chapter]}`);
    clock.textContent=`${String(Math.floor(time)).padStart(2,'0')} / 39 s`;
  }
  function tick(now){
    frame=0;
    if(previous) time=Math.min(duration,time+(now-previous)/1000);
    previous=now;draw();
    if(time>=duration){playing=false;sync();return;}
    if(playing&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  function sync(){
    cancelAnimationFrame(frame);frame=0;previous=0;
    play.textContent=playing?'Pause':'Play';
    play.setAttribute('aria-label',playing?'Pause explanation':'Play explanation');
    stage.dataset.playing=String(playing&&visible&&!document.hidden);
    if(playing&&visible&&!document.hidden)frame=requestAnimationFrame(tick);
    draw();
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();width=rect.width;mobile=width<620;height=mobile?646:445;
    canvas.style.height=height+'px';const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  play.addEventListener('click',()=>{if(time>=duration)time=0;playing=!playing;sync();});
  replay.addEventListener('click',()=>{time=0;playing=true;sync();});
  slider.addEventListener('input',()=>{time=Number(slider.value);playing=false;sync();});
  chapters.forEach((button,i)=>button.addEventListener('click',()=>{time=playing?starts[i]+.8:(starts[i+1]||duration)-.4;sync();}));
  reduced.addEventListener('change',()=>{playing=!reduced.matches;if(reduced.matches)time=(starts[getChapter()+1]||duration)-.4;sync();});
  document.addEventListener('visibilitychange',sync);
  new ResizeObserver(resize).observe(canvas);
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.15}).observe(canvas);
  else visible=true;
  document.querySelector('.animation-controls').hidden=false;
  document.querySelector('.animation-chapters').hidden=false;
  resize();sync();
})();
