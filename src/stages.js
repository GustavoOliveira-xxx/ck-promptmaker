import {validate,hasSite} from './core.js';
export function stageErrors(a,profile,files,stage){
 const all=validate(a);
 if(stage===0){
  const errors=all.filter(e=>!/formato de entrega|entrega personalizada|URL de repositório/.test(e));
  if(a.mode==='individual'&&!profile.name?.trim())errors.push('Preencha seu nome em Meu perfil para identificar a autoria individual.');
  return errors;
 }
 if(stage===1){
  const errors=all.filter(e=>/formato de entrega|entrega personalizada|URL de repositório/.test(e));
  if(hasSite(a)&&a.website.identity==='custom'&&!a.website.details.trim())errors.push('Descreva a identidade personalizada e os detalhes do site.');
  if(hasSite(a)&&a.website.hasMedia&&!files.some(f=>f.ownerType==='activity'&&f.ownerId===a.id&&f.kind==='media'))errors.push('Anexe o pacote de mídia ZIP ou desmarque a opção de mídia selecionada.');
  return errors;
 }
 if(stage===2)return a.materialsReviewed?[]:['Revise os materiais e confirme a conferência antes de gerar o prompt.'];
 return [];
}
export function firstIncompleteStage(a,profile,files,target=3){
 for(let stage=0;stage<Math.min(3,target);stage++){const errors=stageErrors(a,profile,files,stage);if(errors.length)return {stage,errors};}
 return null;
}

