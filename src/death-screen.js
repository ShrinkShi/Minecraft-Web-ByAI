export class DeathScreen{
  constructor(){
    this.root=document.querySelector('#death-menu');
    this.reason=document.querySelector('#death-reason');
    this.detail=document.querySelector('#death-detail');
    if(!this.root||!this.reason||!this.detail)throw new Error('death screen DOM is incomplete');
  }

  set(reason='你死了',detail=''){this.reason.textContent=reason;this.detail.textContent=detail;}
  hide(){this.root.classList.remove('active');}
  get active(){return this.root.classList.contains('active');}
}
