/* ---------- render ---------- */
window.__stage="render";
function bubble(role,text,isErr){
  var d=document.createElement("div");
  d.className="msg "+(role==="user"?"user":"ai")+(isErr?" err":"");
  d.innerHTML='<div class="bub">'+(role==="user"?esc(text).replace(/\n/g,"<br>"):(isErr?esc(text):md(text)))+"</div>";
  return d;
}
function showTyping(){
  if($("typing"))return;
  var d=document.createElement("div");d.className="msg ai";d.id="typing";
  d.innerHTML='<div class="typing">'+LOGO+'</div>';
  $("thread").appendChild(d);scrollDown();
}
function hideTyping(){var t=$("typing");t&&t.remove()}
function renderChat(){
  var th=$("thread");th.innerHTML="";
  var c=getChat();
  var has=c&&c.msgs.length>0;
  $("welcome").style.display=has?"none":"flex";
  if(c)c.msgs.forEach(function(m){th.appendChild(bubble(m.r,m.t,m.e))});
  if(busy&&sc&&c&&sc.id===c.id){if(live)live.el=th.lastChild;else showTyping()}
  scrollDown();
}
function renderList(){
  var l=$("list");l.innerHTML="";
  if(!chats.length){l.innerHTML='<div class="empty">No chats yet</div>';return}
  chats.slice().reverse().forEach(function(c){
    var it=document.createElement("div");
    it.className="item"+(c.id===cur?" active":"");
    it.innerHTML='<div class="del">Delete</div><div class="row"></div>';
    var row=it.querySelector(".row");
    row.textContent=c.title||"New chat";
    var sx=0,dx=0,moved=false;
    row.addEventListener("touchstart",function(e){sx=e.touches[0].clientX;dx=0;moved=false;row.style.transition="none"},{passive:true});
    row.addEventListener("touchmove",function(e){dx=Math.min(0,e.touches[0].clientX-sx);if(Math.abs(dx)>6)moved=true;row.style.transform="translateX("+dx+"px)"},{passive:true});
    row.addEventListener("touchend",function(){
      row.style.transition="";
      if(dx<-110){row.style.transform="translateX(-110%)";buzz(15);setTimeout(function(){delChat(c.id)},180)}
      else{row.style.transform="";if(!moved){cur=c.id;persist();renderChat();closeDrawer()}}
    });
    l.appendChild(it);
  });
}
function delChat(id){
  chats=chats.filter(function(c){return c.id!==id});
  if(cur===id)cur=null;
  persist();renderList();renderChat();
}
function newChat(){
  var c={id:"c"+Date.now(),title:"New chat",msgs:[]};
  chats.push(c);cur=c.id;persist();renderChat();renderList();
}

/* ---------- drawer / sheet ---------- */
window.__stage="drawer";
function openDrawer(){renderList();$("drawer").classList.add("on");$("scrim").classList.add("on")}
function closeDrawer(){$("drawer").classList.remove("on");$("scrim").classList.remove("on")}
var MODELS={gemini:["gemini-flash-latest","gemini-3.5-flash","gemini-2.5-flash","gemini-flash-lite-latest"],claude:["claude-sonnet-5-5","claude-opus-5-5","claude-haiku-5-5"]};
var shown="gemini";
function fillSheet(p){
  shown=p;
  $("provSel").value=p;
  $("keyInp").value=settings.keys[p]||"";
  $("keyInp").placeholder=p==="gemini"?"AIza...":"sk-ant-...";
  $("modelInp").value=settings.models[p]||DEF.models[p];
  var h="";for(var i=0;i<MODELS[p].length;i++)h+='<option value="'+MODELS[p][i]+'">';
  $("models").innerHTML=h;
  $("keyHint").textContent=p==="gemini"?"Get a free key: aistudio.google.com/apikey":"Get a key: console.anthropic.com/settings/keys";
}
function openSheet(){
  fillSheet(settings.provider);$("themeSel").value=settings.theme;
  $("sheet").classList.add("on");$("scrim2").classList.add("on");
}
$("provSel").onchange=function(){
  settings.keys[shown]=$("keyInp").value.trim();
  settings.models[shown]=$("modelInp").value.trim()||DEF.models[shown];
  fillSheet($("provSel").value);
};
$("keyHint").onclick=function(){
  var u=shown==="gemini"?"https://aistudio.google.com/apikey":"https://console.anthropic.com/settings/keys";
  try{hasBridge&&Android.openUrl(u)}catch(e){}
};
function closeSheet(){$("sheet").classList.remove("on");$("scrim2").classList.remove("on")}
$("menuBtn").onclick=openDrawer;
$("scrim").onclick=closeDrawer;
$("scrim2").onclick=closeSheet;
$("newBtn").onclick=function(){newChat();buzz(10)};
$("drawerNew").onclick=function(){newChat();closeDrawer()};
$("openSettings").onclick=function(){closeDrawer();openSheet()};
$("saveSet").onclick=function(){
  settings.keys[shown]=$("keyInp").value.trim();
  settings.models[shown]=$("modelInp").value.trim()||DEF.models[shown];
  settings.provider=$("provSel").value;
  settings.theme=$("themeSel").value;
  save("claude_settings",settings);applyTheme();closeSheet();toast("Saved");
};
$("clearAll").onclick=function(){
  if(confirm("Clear all chats?")){chats=[];cur=null;persist();renderList();renderChat();closeSheet();toast("Chats cleared")}
};
$("aboutBtn").onclick=function(){alert("Claude\nVersion 1.0\n\nPowered by Google Gemini or the Anthropic API.")};
window.onBack=function(){
  if($("sheet").classList.contains("on")){closeSheet();return true}
  if($("drawer").classList.contains("on")){closeDrawer();return true}
  return false;
};
window.__f=(window.__f||"")+"ui ";
