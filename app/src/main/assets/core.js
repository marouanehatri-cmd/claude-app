var $=function(id){return document.getElementById(id)};
var hasBridge=typeof Android!=="undefined";
function buzz(ms){try{hasBridge&&Android.vibrate(ms)}catch(e){}}
var LOGO='<svg class="lg"><use href="#logo" xlink:href="#logo"/></svg>';
var UP='<svg class="i" viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
var STOP='<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';

/* ---------- storage ---------- */
window.__stage="storage";
var DEF={key:"",model:"claude-sonnet-5-5",theme:"auto"};
function load(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var settings={},_sv=load("claude_settings",{});for(var _k in DEF)settings[_k]=(_sv&&_sv[_k]!=null)?_sv[_k]:DEF[_k];
var chats=load("claude_chats",[]);
var cur=load("claude_cur",null);
var busy=false,pending=null,live=null,sc=null,raf=0,barsReady=false;

function persist(){save("claude_chats",chats);save("claude_cur",cur)}
function getChat(){for(var i=0;i<chats.length;i++){if(chats[i].id===cur)return chats[i]}return undefined}

/* ---------- theme ---------- */
window.__stage="theme";
function applyTheme(){
  var dark=settings.theme==="dark"||(settings.theme==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  if(barsReady){try{hasBridge&&Android.setBars(dark)}catch(e){}}
}
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",applyTheme)}catch(e){}
applyTheme();

/* ---------- markdown ---------- */
window.__stage="markdown";
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function inline(s){
  return esc(s)
    .replace(/`([^`\n]+)`/g,"<code>$1</code>")
    .replace(/\*\*([^*\n]+)\*\*/g,"<b>$1</b>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g,"$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s"]+)\)/g,'<a href="$2">$1</a>');
}
function block(t){
  var out="",list=null;
  function close(){if(list){out+="</"+list+">";list=null}}
  t.split("\n").forEach(function(l){
    var m;
    if((m=l.match(/^\s*[-*•]\s+(.*)/))){if(list!=="ul"){close();out+="<ul>";list="ul"}out+="<li>"+inline(m[1])+"</li>"}
    else if((m=l.match(/^\s*\d+[.)]\s+(.*)/))){if(list!=="ol"){close();out+="<ol>";list="ol"}out+="<li>"+inline(m[1])+"</li>"}
    else if((m=l.match(/^(#{1,3})\s+(.*)/))){close();var h=m[1].length+2;out+="<h"+h+">"+inline(m[2])+"</h"+h+">"}
    else if(!l.trim()){close()}
    else{close();out+="<p>"+inline(l)+"</p>"}
  });
  close();return out;
}
function md(t){
  var parts=t.split("```"),out="";
  for(var i=0;i<parts.length;i++){
    if(i%2){var p=parts[i],nl=p.indexOf("\n");out+="<pre><code>"+esc(nl>=0?p.slice(nl+1):p)+"</code></pre>"}
    else out+=block(parts[i]);
  }
  return out;
}
$("thread").addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest("a");
  if(a){e.preventDefault();try{hasBridge&&Android.openUrl(a.getAttribute("href"))}catch(x){}}
});

var toastT;
function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove("on")},2200)}
function scrollDown(){var m=$("msgs");m.scrollTop=m.scrollHeight}
function nearBottom(){var m=$("msgs");return m.scrollHeight-m.scrollTop-m.clientHeight<140}
window.__f=(window.__f||"")+"core ";
