/* ---------- composer ---------- */
window.__stage="composer";
var inp=$("inp"),sendBtn=$("send");
function setBusy(b){
  busy=b;
  sendBtn.innerHTML=b?STOP:UP;
  sendBtn.disabled=b?false:!inp.value.trim();
}
inp.addEventListener("input",function(){
  inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight,130)+"px";
  if(!busy)sendBtn.disabled=!inp.value.trim();
});
sendBtn.onclick=function(){busy?stopGen():doSend()};
setBusy(false);

function doSend(){
  var text=inp.value.trim();
  if(!text||busy)return;
  if(!settings.keys[settings.provider]){toast("Add your API key in Settings");openSheet();return}
  buzz(25);
  if(!getChat())newChat();
  var c=getChat();
  c.msgs.push({r:"user",t:text});
  if(c.msgs.length===1)c.title=text.slice(0,40);
  persist();
  inp.value="";inp.style.height="auto";
  $("welcome").style.display="none";
  $("thread").appendChild(bubble("user",text));
  sc=c;live=null;setBusy(true);showTyping();
  var hist=c.msgs.filter(function(m){return !m.e}).map(function(m){return{role:m.r==="user"?"user":"assistant",content:m.t}});
  pending="r"+Date.now();
  if(hasBridge){
    Android.send(pending,settings.provider,settings.keys[settings.provider],settings.models[settings.provider],JSON.stringify(hist));
  }else{
    var id=pending,words="Preview mode: streaming works on the device with the Android bridge.".split(" "),i=0;
    var iv=setInterval(function(){
      if(id!==pending){clearInterval(iv);return}
      if(i<words.length)window.onDelta(id,words[i++]+" ");else{clearInterval(iv);window.onDone(id)}
    },120);
  }
}

/* ---------- streaming callbacks ---------- */
window.__stage="streaming";
function paint(){
  raf=0;
  if(live&&live.el&&sc&&sc.id===cur){
    var nb=nearBottom();
    live.el.querySelector(".bub").innerHTML=md(live.msg.t);
    if(nb)scrollDown();
  }
}
function finish(){
  if(raf){cancelAnimationFrame(raf);raf=0}
  paint();
  pending=null;live=null;sc=null;
  hideTyping();persist();setBusy(false);
}
window.onDelta=function(id,t){
  if(id!==pending||!sc)return;
  if(!live){
    var m={r:"assistant",t:""};
    sc.msgs.push(m);
    live={msg:m,el:null};
    if(sc.id===cur){hideTyping();var el=bubble("assistant","");$("thread").appendChild(el);live.el=el}
  }
  live.msg.t+=t;
  if(!raf)raf=requestAnimationFrame(paint);
};
window.onDone=function(id){
  if(id!==pending)return;
  finish();buzz(12);
};
window.onErr=function(id,msg){
  if(id!==pending)return;
  if(live){toast(msg)}
  else if(sc){
    sc.msgs.push({r:"assistant",t:msg,e:true});
    if(sc.id===cur){hideTyping();$("thread").appendChild(bubble("assistant",msg,true));scrollDown()}
  }
  finish();buzz(40);
};
function stopGen(){
  if(!busy)return;
  try{hasBridge&&Android.cancel(pending)}catch(e){}
  finish();buzz(10);
}

/* ---------- pull to refresh ---------- */
window.__stage="pull";
(function(){
  var m=$("msgs"),ptr=$("ptr"),sy=0,pull=0,on=false;
  m.addEventListener("touchstart",function(e){if(m.scrollTop<=0){sy=e.touches[0].clientY;on=true}else on=false},{passive:true});
  m.addEventListener("touchmove",function(e){
    if(!on)return;
    pull=Math.max(0,Math.min(80,(e.touches[0].clientY-sy)*0.5));
    ptr.style.transition="none";ptr.style.height=pull+"px";
    ptr.textContent=pull>=60?"Release to refresh":"Pull to refresh";
  },{passive:true});
  m.addEventListener("touchend",function(){
    if(!on)return;on=false;
    ptr.style.transition="";
    if(pull>=60){ptr.textContent="Refreshing…";buzz(15);setTimeout(function(){renderChat();ptr.style.height="0";toast("Refreshed")},500)}
    else ptr.style.height="0";
    pull=0;
  });
})();

/* ---------- init ---------- */
window.__stage="init";
if(!getChat()&&chats.length)cur=chats[chats.length-1].id;
renderChat();renderList();
setTimeout(function(){
  $("splash").classList.add("out");
  barsReady=true;applyTheme();
},1700);
window.__ok="yes";
window.__ok="yes";window.__f=(window.__f||"")+"app ";
