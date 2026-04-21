const DEFAULTS={enableDeleteButton:false,enableRecentCount:false,enableDeleteShortcut:false,enableNavShortcuts:false,enableAutoScrollRecent:false,enableAutoMoveAfterDelete:false,enableDeleteTimerDisplay:false,deleteTimerDurationMs:300000,autoMoveDelayMs:4000,autoScrollIntervalMs:60000,autoScrollMaxRuns:20,autoScrollStepWaitMs:2000,autoScrollRecentThreshold:100};
function clamp(n,min,max,fallback){n=Number(n); if(!Number.isFinite(n)) return fallback; return Math.max(min, Math.min(max, Math.round(n)));}
async function load(){
  const data=await chrome.storage.sync.get(DEFAULTS);
  for(const key of Object.keys(DEFAULTS)){
    if(['deleteTimerDurationMs','autoMoveDelayMs','autoScrollIntervalMs','autoScrollMaxRuns','autoScrollStepWaitMs','autoScrollRecentThreshold'].includes(key)) continue;
    document.getElementById(key).checked=!!data[key];
  }
  document.getElementById('deleteTimerMin').value=String(Math.round((data.deleteTimerDurationMs||300000)/60000));
  document.getElementById('autoMoveDelaySec').value=String(Math.round((data.autoMoveDelayMs||4000)/1000));
  document.getElementById('autoScrollIntervalMin').value=String(Math.round((data.autoScrollIntervalMs||60000)/60000));
  document.getElementById('autoScrollMaxRuns').value=String(data.autoScrollMaxRuns||20);
  document.getElementById('autoScrollStepWaitSec').value=String(Math.round((data.autoScrollStepWaitMs||2000)/1000));
  document.getElementById('autoScrollRecentThreshold').value=String(data.autoScrollRecentThreshold||100);
}
async function save(){
  const payload={};
  for(const key of Object.keys(DEFAULTS)){
    if(['deleteTimerDurationMs','autoMoveDelayMs','autoScrollIntervalMs','autoScrollMaxRuns','autoScrollStepWaitMs','autoScrollRecentThreshold'].includes(key)) continue;
    payload[key]=document.getElementById(key).checked;
  }
  payload.deleteTimerDurationMs=clamp(document.getElementById('deleteTimerMin').value,1,1440,5)*60000;
  payload.autoMoveDelayMs=clamp(document.getElementById('autoMoveDelaySec').value,3,5,4)*1000;
  payload.autoScrollIntervalMs=clamp(document.getElementById('autoScrollIntervalMin').value,1,30,1)*60000;
  payload.autoScrollMaxRuns=clamp(document.getElementById('autoScrollMaxRuns').value,1,200,20);
  payload.autoScrollStepWaitMs=clamp(document.getElementById('autoScrollStepWaitSec').value,1,300,2)*1000;
  payload.autoScrollRecentThreshold=clamp(document.getElementById('autoScrollRecentThreshold').value,1,1000,100);
  await chrome.storage.sync.set(payload);
  const status=document.getElementById('status'); status.textContent='保存しました'; setTimeout(()=>{status.textContent='';},1200);
}
async function disableAll(){
  await chrome.storage.sync.set(DEFAULTS);
  await load();
  const status=document.getElementById('status'); status.textContent='全部オフにしました'; setTimeout(()=>{status.textContent='';},1200);
}
document.getElementById('save').addEventListener('click', save);
document.getElementById('disableAll').addEventListener('click', disableAll);
load();