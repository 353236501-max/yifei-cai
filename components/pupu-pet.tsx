"use client";

import {useEffect, useRef, useState, type PointerEvent} from 'react';
import {Cat, Fish, Moon, Pause, Play, Sparkles, Volume2, VolumeX, X} from 'lucide-react';
import styles from './pupu-pet.module.css';

type State = 'idle' | 'eat' | 'sleep' | 'stretch';
type Point = {x: number; y: number};
const storageKey = 'yuzhi.pupu.v1';
const words = [
  '早觉雨大人，把一个条件想清楚，就是今天实实在在的进步。',
  '早觉雨大人，卡住时先写下已知条件，小猫陪你一起找下一步。',
  '早觉雨大人，不必一下子做完所有题。认真完成眼前这一步，就很好。',
  '早觉雨大人，能说出方法为什么成立，比记住一个答案更有力量。',
  '早觉雨大人，休息一会儿也没关系，我们可以带着更清醒的头脑回来。',
  '早觉雨大人，今天不必一次征服整章，先拿下一个定义，再把它用到一道题里。',
  '早觉雨大人，做错题时先找分岔点，错误会变成下一次判断的路标。',
  '早觉雨大人，能把题目条件逐条写出，就是在给思路搭台阶。',
  '早觉雨大人，如果一种方法卡住了，换一个表示方式，能力也会从新角度长出来。',
  '早觉雨大人，今天的目标可以小而具体：弄懂一个公式的来处，并亲手用一次。',
  '早觉雨大人，慢一点核对单位、定义域和边界，稳稳的正确很有力量。',
  '早觉雨大人，记不住并不说明不适合，隔一会儿再回忆一次，记忆正在建立。',
  '早觉雨大人，题目的难度不是对你的评价，它只是告诉我们下一步练哪一种方法。',
  '早觉雨大人，连续专注一小段，再认真休息，节奏本身也是备考能力。',
  '早觉雨大人，看到熟悉的结构时先说出理由，再写公式，答案会更牢。',
  '早觉雨大人，能回头修正一个步骤，说明你已经在用更高的视角检查自己。',
  '早觉雨大人，别把一次模拟的分数当成结论，它只是一张帮助我们调整计划的地图。',
  '早觉雨大人，先完成最小的一步：画图、列式或写出已知条件，思路会慢慢显形。',
  '早觉雨大人，遇到长题时把它拆成几个短问题，每个小答案都在推进全局。',
  '早觉雨大人，今天愿意坐回书桌前，就是对目标的一次温柔回应。',
  '早觉雨大人，疲惫时降低一点速度，不降低对自己的尊重。',
  '早觉雨大人，比较昨天的自己就好，稳定积累比短暂冲刺更适合长期复习。',
  '早觉雨大人，你不需要完美才配继续，带着不确定也可以先做下一步。',
  '早觉雨大人，把一道题讲给未来的自己听，理解会从会做变成会迁移。',
  '早觉雨大人，遇到停滞时先喝口水、伸伸肩，然后把问题缩小到一句话。',
  '早觉雨大人，方法可以调整，目标可以拆开，向前的方向始终可以由你来决定。',
];
const labels: Record<State, string> = {idle: '陪你学习', eat: '吃点小鱼干', sleep: '安静休息', stretch: '伸个懒腰'};

export default function PupuPet() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [energy, setEnergy] = useState(80);
  const [position, setPosition] = useState<Point | null>(null);
  const [message, setMessage] = useState(words[0]);
  const [imageFailed, setImageFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const petButton = useRef<HTMLButtonElement>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<{start: Point; origin: Point; moved: boolean} | null>(null);
  const suppressClick = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const wordIndex = useRef(0);
  const frozen = paused || reduced || !pageVisible;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved && typeof saved === 'object') {
        setHidden(saved.hidden === true);
        setMuted(saved.muted !== false);
        setPaused(saved.paused === true);
        if (Number.isFinite(saved.position?.x) && Number.isFinite(saved.position?.y)) setPosition(saved.position);
      }
    } catch { /* Storage can be disabled; the pet remains usable this session. */ }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    motion(); visibility(); setReady(true);
    media.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
      audio.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({hidden, muted, paused, position})); } catch { /* Optional preferences only. */ }
  }, [ready, hidden, muted, paused, position]);

  function bounded(point: Point): Point {
    const rect = box.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(point.x, window.innerWidth - (rect?.width || 240) - 8)),
      y: Math.max(8, Math.min(point.y, window.innerHeight - (rect?.height || 160) - 8)),
    };
  }

  useEffect(() => {
    if (!ready || hidden) return;
    const clamp = () => setPosition(old => {
      const next = bounded(old || {x: window.innerWidth, y: window.innerHeight});
      return old?.x === next.x && old?.y === next.y ? old : next;
    });
    clamp();
    const observer = new ResizeObserver(clamp);
    if (box.current) observer.observe(box.current);
    window.addEventListener('resize', clamp);
    return () => {observer.disconnect(); window.removeEventListener('resize', clamp);};
  }, [ready, hidden, open]);

  useEffect(() => {
    if (hidden || frozen) return;
    const timer = window.setInterval(() => {
      setEnergy(old => Math.max(0, Math.min(100, old + (state === 'sleep' ? 8 : -2))));
    }, 15000);
    return () => clearInterval(timer);
  }, [hidden, frozen, state]);

  useEffect(() => {if (energy === 0 && state === 'idle') setState('sleep');}, [energy, state]);
  useEffect(() => {
    if (state !== 'eat' && state !== 'stretch') return;
    const timer = window.setTimeout(() => setState('idle'), state === 'eat' ? 3500 : 2500);
    return () => clearTimeout(timer);
  }, [state]);

  function sound(force = false) {
    if (muted && !force) return;
    audio.current ??= new Audio('/pets/pupu/meow.wav');
    audio.current.preload = 'auto';
    audio.current.volume = 0.2;
    audio.current.currentTime = 0;
    void audio.current.play().catch(() => setMessage('早觉雨大人，浏览器暂未播放声音，小猫仍然在这里陪你。'));
  }
  function encourage() {
    wordIndex.current = (wordIndex.current + 1) % words.length;
    setMessage(words[wordIndex.current]); sound();
  }
  function beginDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !box.current) return;
    const rect = box.current.getBoundingClientRect();
    suppressClick.current = false;
    drag.current = {start: {x: event.clientX, y: event.clientY}, origin: {x: rect.x, y: rect.y}, moved: false};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.start.x, dy = event.clientY - drag.current.start.y;
    if (Math.hypot(dx, dy) > 5) drag.current.moved = true;
    if (drag.current.moved) setPosition(bounded({x: drag.current.origin.x + dx, y: drag.current.origin.y + dy}));
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    suppressClick.current = !!drag.current?.moved;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function closePanel() {setOpen(false); petButton.current?.focus();}
  function hide() {
    setHidden(true); setOpen(false); audio.current?.pause();
    window.requestAnimationFrame(() => restoreButton.current?.focus());
  }

  if (!ready) return null;
  if (hidden) return <button ref={restoreButton} className={styles.restore} onClick={() => {
    setHidden(false); window.requestAnimationFrame(() => petButton.current?.focus());
  }} aria-label="召回 Pupu 小猫"><Cat size={18}/> 小猫陪伴</button>;

  return <div ref={box} className={styles.pet} style={position ? {left: position.x, top: position.y} : {right: 12, bottom: 12}}
    onKeyDown={event => {if (event.key === 'Escape') closePanel();}}>
    {open && <section id="pupu-controls" className={styles.panel} aria-label="Pupu 小猫互动">
      <header><strong>Pupu · 自习搭子</strong><button type="button" onClick={closePanel} aria-label="关闭小猫菜单"><X size={18}/></button></header>
      <p aria-live="polite">{message}</p>
      <div className={styles.energy}><span>小猫精力</span><meter min={0} max={100} value={energy} aria-label="小猫精力"/><span>{energy}</span></div>
      <div className={styles.actions}>
        <button onClick={() => {setState('eat'); setEnergy(e => Math.min(100, e + 20)); setMessage('早觉雨大人，小鱼干收到啦！你也记得喝口水。'); sound();}}><Fish size={16}/>喂食</button>
        <button onClick={() => {setState(state === 'sleep' ? 'idle' : 'sleep'); setMessage(state === 'sleep' ? words[0] : '早觉雨大人，小猫安静休息，你可以按自己的节奏继续。'); sound();}}><Moon size={16}/>{state === 'sleep' ? '叫醒' : '休息'}</button>
        <button onClick={() => {setState('stretch'); setMessage('早觉雨大人，活动一下肩膀，下一步可以慢慢想。'); sound();}}><Cat size={16}/>伸懒腰</button>
        <button onClick={encourage}><Sparkles size={16}/>鼓励我</button>
        <button aria-pressed={!muted} onClick={() => {if (muted) {setMuted(false); sound(true);} else {setMuted(true); audio.current?.pause();}}}>{muted ? <VolumeX size={16}/> : <Volume2 size={16}/>} {muted ? '开启声音' : '静音'}</button>
        <button aria-pressed={paused} disabled={reduced} onClick={() => setPaused(!paused)}>{frozen ? <Play size={16}/> : <Pause size={16}/>} {reduced ? '减少动态' : paused ? '播放动画' : '暂停动画'}</button>
      </div>
      <a href="https://github.com/CZengC/pupu_pet" target="_blank" rel="noreferrer">宠物资源：CZengC/pupu_pet</a>
    </section>}
    <div className={styles.avatarRow}>
      <button ref={petButton} className={styles.avatar} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={() => {drag.current = null;}}
        onClick={event => {if (suppressClick.current && event.detail !== 0) {suppressClick.current = false; return;} setOpen(!open); sound();}}
        onContextMenu={event => {event.preventDefault(); setOpen(true);}}
        onKeyDown={event => {
          const movement: Record<string, Point> = {ArrowLeft:{x:-20,y:0},ArrowRight:{x:20,y:0},ArrowUp:{x:0,y:-20},ArrowDown:{x:0,y:20}};
          if (movement[event.key] && position) {event.preventDefault(); const delta = movement[event.key]; setPosition(bounded({x:position.x+delta.x,y:position.y+delta.y}));}
        }}
        aria-label={`Pupu 小猫：${labels[state]}。点击互动，可拖动或用方向键移动`} aria-expanded={open} aria-controls="pupu-controls">
        {imageFailed ? <span>小猫暂时休息<br/>点击互动</span> : <img src={`/pets/pupu/cat_${state}.${frozen ? 'png' : 'gif'}`} alt="" width={112} height={112} draggable={false} onError={() => setImageFailed(true)}/>}
      </button>
    </div>
    <div className={styles.caption}><span>{labels[state]}</span><button onClick={hide}>收起小猫</button></div>
  </div>;
}

