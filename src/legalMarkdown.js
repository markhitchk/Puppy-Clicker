// Safe, deliberately limited Markdown presentation model; all text is rendered as React text.
export const LEGAL_DOCS = Object.freeze({
  privacy:{title:"Privacy Policy",path:"/assets/legal/privacy-policy.md"},
  terms:{title:"Terms of Use",path:"/assets/legal/terms-of-use.md"}
});
export function legalSlug(text){
  return String(text).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9 -]/g,"").trim().replace(/\s+/g,"-") || "section";
}
export function safeLegalHref(raw){
  const value=String(raw||"").trim();
  if(/^https:\/\/[^\s<>"']+$/i.test(value))return value;
  if(/^\/[a-z0-9/_#?=.&%-]*$/i.test(value) && !value.startsWith("//"))return value;
  if(/^#[a-z0-9_-]+$/i.test(value))return value;
  return null;
}
export function parseLegalMarkdown(markdown){
  const lines=String(markdown).replace(/\r\n?/g,"\n").split("\n");
  const blocks=[],headings=[];let i=0;
  const slugs=new Map();
  while(i<lines.length){
    const line=lines[i];if(!line.trim()){i++;continue;}
    const heading=/^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if(heading){
      const title=heading[2].replace(/\s+#+\s*$/,"");
      const base=legalSlug(title),seen=slugs.get(base)||0;
      slugs.set(base,seen+1);
      const id=seen?base+"-"+(seen+1):base;
      const block={kind:"heading",level:heading[1].length,title,id};
      blocks.push(block);headings.push(block);i++;continue;
    }
    if(/^\s*---+\s*$/.test(line)){blocks.push({kind:"rule"});i++;continue;}
    if(/^\s*>\s?/.test(line)){
      const rows=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i]))
        rows.push(lines[i++].replace(/^\s*>\s?/,""));
      blocks.push({kind:"quote",text:rows.join(" ")});continue;
    }
    if(/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)){
      const ordered=/^\s*\d+[.)]\s+/.test(line),items=[];
      const re=ordered?/^\s*\d+[.)]\s+/:/^\s*[-*+]\s+/;
      while(i<lines.length&&re.test(lines[i]))items.push(lines[i++].replace(re,""));
      blocks.push({kind:ordered?"ordered":"list",items});continue;
    }
    if(/^\s*```/.test(line)){
      const lang=line.replace(/^\s*```/,"").trim();i++;
      const rows=[];
      while(i<lines.length&&!/^\s*```/.test(lines[i]))rows.push(lines[i++]);
      if(i<lines.length)i++;
      blocks.push({kind:"code",lang,text:rows.join("\n")});continue;
    }
    const paragraph=[];
    while(i<lines.length&&lines[i].trim()&&!/^(#{1,4})\s+|\s*[-*+]\s+|\s*\d+[.)]\s+|\s*>\s?|\s*---+\s*$|\s*```/.test(lines[i]))
      paragraph.push(lines[i++].trim());
    if(paragraph.length)blocks.push({kind:"paragraph",text:paragraph.join(" ")});
    else {blocks.push({kind:"paragraph",text:line});i++;}
  }
  return {blocks,headings};
}
