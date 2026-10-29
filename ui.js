'use strict';
(() => {
  const $=id=>document.getElementById(id),dialog=$('settingsDialog');
  let previousFocus=null;
  function selectTab(name){
    for(const button of document.querySelectorAll('[data-settings-tab]')){
      const active=button.dataset.settingsTab===name;
      button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
      $(button.getAttribute('aria-controls')).hidden=!active;
    }
    $('settingsTitle').textContent=({view:'Вид и управление',physics:'Физическая модель',system:'Система и сохранения',object:'Параметры объекта'})[name]||'Настройки';
  }
  function open(name='view'){
    OrbitFoundry.cancelPointer();OrbitFoundry.clearNavigation();selectTab(name);
    if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}
    $('closeSettings').focus();
  }
  function close(){dialog.close();}
  dialog.addEventListener('close',()=>{OrbitFoundry.clearNavigation();previousFocus?.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  $('cinemaBtn').addEventListener('click',close);
  $('settingsBtn').onclick=()=>open('view');$('closeSettings').onclick=close;
  for(const button of document.querySelectorAll('[data-settings-tab]')){
    button.onclick=()=>selectTab(button.dataset.settingsTab);
    button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const list=[...document.querySelectorAll('[data-settings-tab]')],i=list.indexOf(button),n=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;selectTab(list[n].dataset.settingsTab);list[n].focus();};
  }
  new MutationObserver(()=>{$('uiTarget').textContent=$('bodyName').textContent;$('bodyName').title=$('bodyName').textContent;const empty=OrbitFoundry.selected==null;$('impactLaunch').disabled=empty;$('editorToggle').disabled=empty;}).observe($('bodyName'),{childList:true,characterData:true,subtree:true});
  function experimentMode(manual){
    document.querySelector('.left').dataset.mode=manual?'manual':'impact';$('manualTools').open=manual;
    for(const [id,active]of [['impactModeBtn',!manual],['manualModeBtn',manual]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
    document.querySelector('.left').scrollTop=0;
  }
  $('impactModeBtn').onclick=()=>{experimentMode(false);OrbitFoundry.select(OrbitFoundry.cameraAnchorId);document.querySelector('[data-tool=select]').click();};
  $('manualModeBtn').onclick=()=>{experimentMode(true);document.querySelector('[data-tool=launch]').click();};
  window.EarthUI={open,close,isModalOpen:()=>dialog.open,showLeft(name){
    if(name==='display')open('view');
    else if(name==='scenes'){close();OrbitFoundry.select(OrbitFoundry.cameraAnchorId);}
    else if(name==='create'){experimentMode(true);}
  },showImpact(newReport){
    // Result stays in the experiment panel; global telemetry never disappears.
    $('impactReport').setAttribute('tabindex','-1');
    if(newReport)experimentMode(false);
  }};
  selectTab('view');
})();
