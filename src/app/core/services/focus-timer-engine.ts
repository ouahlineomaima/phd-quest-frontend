export type TimerState = 'running' | 'paused' | 'finished';
export interface TimerSnapshot {
  version:1; sessionId:string; kind:'focus'|'break'; mode:'countdown'|'stopwatch'; targetSeconds:number|null;
  state:TimerState; startedAt:number; lastStartedAt:number|null; accumulatedSeconds:number; endedAt:number|null; taskRef:string|null;
}
export const STOPWATCH_LIMIT = 7*24*60*60;
export function elapsed(snapshot:TimerSnapshot,now:number):number {
  return Math.min(snapshot.targetSeconds ?? STOPWATCH_LIMIT,snapshot.accumulatedSeconds+(snapshot.state==='running'?Math.max(0,now-snapshot.lastStartedAt!):0));
}
export function finish(snapshot:TimerSnapshot,now:number):TimerSnapshot {
  const seconds=elapsed(snapshot,now),limit=snapshot.targetSeconds??STOPWATCH_LIMIT;
  const endedAt=snapshot.state==='running'&&seconds>=limit?snapshot.lastStartedAt!+limit-snapshot.accumulatedSeconds:now;
  return {...snapshot,state:'finished',accumulatedSeconds:seconds,lastStartedAt:null,endedAt};
}
export function transition(snapshot:TimerSnapshot,action:'pause'|'resume'|'finish',now:number):TimerSnapshot {
  if(snapshot.state==='finished')return snapshot;
  if(elapsed(snapshot,now)>=(snapshot.targetSeconds??STOPWATCH_LIMIT))return finish(snapshot,now);
  if(action==='finish')return finish(snapshot,now);
  if(action==='pause'&&snapshot.state==='running')return {...snapshot,state:'paused',accumulatedSeconds:elapsed(snapshot,now),lastStartedAt:null};
  if(action==='resume'&&snapshot.state==='paused')return {...snapshot,state:'running',lastStartedAt:now};
  return snapshot;
}
export function parseTimer(text:string|null):TimerSnapshot|null {
  if(text===null)return null;const s=JSON.parse(text) as TimerSnapshot;
  if(!s||s.version!==1||!['focus','break'].includes(s.kind)||!['countdown','stopwatch'].includes(s.mode)||!['running','paused','finished'].includes(s.state)||typeof s.sessionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s.sessionId)||!Number.isSafeInteger(s.startedAt)||s.startedAt<0||!Number.isInteger(s.accumulatedSeconds)||s.accumulatedSeconds<0||s.accumulatedSeconds>(s.targetSeconds??STOPWATCH_LIMIT)||
    (s.mode==='countdown'? !Number.isInteger(s.targetSeconds)||s.targetSeconds!<60||s.targetSeconds!>10800||s.targetSeconds!%60!==0 : s.targetSeconds!==null)||
    (s.kind==='break'&&(s.mode!=='countdown'||![300,900].includes(s.targetSeconds!)||s.taskRef!==null))||
    (s.taskRef!==null&&(typeof s.taskRef!=='string'||!/^\d{4}-\d{2}-\d{2}:[a-z0-9][a-z0-9_-]{0,63}$/.test(s.taskRef)))||
    (s.state==='running'? !Number.isSafeInteger(s.lastStartedAt)||s.lastStartedAt!<s.startedAt : s.lastStartedAt!==null)||
    (s.state==='finished'? !Number.isSafeInteger(s.endedAt)||s.endedAt!<s.startedAt||s.accumulatedSeconds>s.endedAt!-s.startedAt : s.endedAt!==null))throw new Error('The saved timer is invalid. Clear its local recovery snapshot to start again. Saved session history is unaffected.');
  return s;
}
export function timerText(seconds:number):string {const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;return (hours?String(hours).padStart(2,'0')+':':'')+String(minutes).padStart(2,'0')+':'+String(rest).padStart(2,'0');}
