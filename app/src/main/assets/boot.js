window.onerror=function(m,src,l,c){var e=document.getElementById("errbox");e.style.display="block";e.textContent+="JS error: "+m+" ("+(src||"").split("/").pop()+":"+l+")\n";return false};
setTimeout(function(){var sp=document.getElementById("splash");if(sp)sp.classList.add("out")},1800);
window.__boot=1;window.__v="v6";window.__f="boot ";
setTimeout(function(){var e=document.getElementById("errbox");if(window.__ok==="yes"&&e&&e.textContent==="")e.style.display="none"},5000);
