import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Card, PageHeader } from '../../shared/components/ui';
import { Icon } from '../../shared/components/icon/icon';
import { PLANNING_PROMPTS } from './planning-prompts';
@Component({selector:'pq-help',standalone:true,imports:[RouterLink,Badge,Card,PageHeader,Icon],templateUrl:'./help.html',styleUrl:'./help.scss'})
export class Help {
  readonly prompts=PLANNING_PROMPTS;readonly copied=signal('');readonly copyError=signal('');
  readonly sections=[['welcome','Welcome'],['getting-started','Getting started'],['roadmap-guide','Three-year roadmap'],['weekly-guide','Weekly planning'],['connected-guide','Goals & connections'],['gamification-guide','Gamification'],['recovery-guide','Backup & recovery'],['troubleshooting','Troubleshooting'],['toolkit','ChatGPT toolkit'],['examples','JSON examples']];
  readonly installation=`mkdir phd-quest
cd phd-quest
git clone https://github.com/ouahlineomaima/phd-quest-backend.git
git clone https://github.com/ouahlineomaima/phd-quest-frontend.git
docker volume create phd-quest_mongo_data
docker compose -f phd-quest-backend/infra/docker-compose.yml up -d --build --wait`;
  readonly serviceCheck='docker compose -f phd-quest-backend/infra/docker-compose.yml ps';
  async copy(id:string,text:string) {
    this.copied.set('');this.copyError.set('');
    try { if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);this.copied.set(id); }
    catch { if(this.fallbackCopy(text))this.copied.set(id);else this.copyError.set(id); }
  }
  private fallbackCopy(text:string):boolean {
    const previous=document.activeElement,area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-9999px';area.setAttribute('aria-hidden','true');document.body.appendChild(area);
    try {area.focus();area.select();return document.execCommand('copy');}catch{return false;}finally{area.remove();if(previous instanceof HTMLElement)previous.focus();}
  }
}
