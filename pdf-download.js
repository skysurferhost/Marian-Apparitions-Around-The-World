/* Sky Surfer v1.12: force direct PDF downloads on local files and GitHub Pages.
   A generated, on-demand sidecar provides the original PDF bytes, which become
   a temporary blob: URL downloaded via a click. Never navigates to the PDF. */
(() => {
  'use strict';
  const button = document.getElementById('openOriginal');
  if (!button) return;
  const pending = new Map();
  const loadScript = (url) => {
    if (pending.has(url)) return pending.get(url);
    const promise = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = url;
      tag.async = true;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error('Could not load the packaged PDF download data.'));
      document.head.append(tag);
    });
    pending.set(url, promise);
    return promise;
  };
  function bytesFromBase64(base64) {
    const parts = [];
    // Each block has a base64 length divisible by 4, avoiding huge atob strings.
    const chunk = 65536;
    for (let i=0; i<base64.length; i+=chunk) {
      const decoded=atob(base64.slice(i,i+chunk));
      const bytes=new Uint8Array(decoded.length);
      for(let j=0;j<decoded.length;j++) bytes[j]=decoded.charCodeAt(j);
      parts.push(bytes);
    }
    return parts;
  }
  button.addEventListener('click', async (event) => {
    const src = decodeURI(button.getAttribute('href') || '');
    if (!src.toLowerCase().endsWith('.pdf')) return; // existing image downloads
    event.preventDefault();
    if(button.dataset.busy === '1') return;
    const asset=window.SKY_SURFER_DOWNLOAD_MANIFEST?.[src];
    if(!asset){
      window.alert('This PDF is not in the download bundle. Run the update script to regenerate its download data.');
      return;
    }
    button.dataset.busy='1';
    const original=button.textContent;
    button.textContent='PREPARING DOWNLOAD…';
    button.setAttribute('aria-busy','true');
    try {
      await loadScript(asset);
      const base64=window.SKY_SURFER_PDF_DATA?.[src];
      if(!base64) throw new Error('PDF file is missing from the packaged download data.');
      const blob=new Blob(bytesFromBase64(base64),{type:'application/pdf'});
      const objectUrl=URL.createObjectURL(blob);
      const download=document.createElement('a');
      download.href=objectUrl;
      download.download=button.getAttribute('download') || src.split('/').pop();
      download.hidden=true;
      document.body.append(download);
      download.click();
      download.remove();
      // Keep the data URL alive until Chrome has started its download.
      setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);
    } catch(error) {
      console.error('Sky Surfer PDF download:',error);
      window.alert('The PDF download could not start. Make sure the full extracted site folder includes the downloads directory.');
    } finally {
      button.dataset.busy='0';
      button.textContent=original;
      button.removeAttribute('aria-busy');
    }
  });
})();
