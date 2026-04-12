document.getElementById('close-btn').addEventListener('click', () => {
  window.electronAPI.hideResponse()
})

let lastCodeBlock = '';

document.getElementById('copy-btn').addEventListener('click', () => {
  const textToCopy = lastCodeBlock || document.querySelector('.content').innerText;
  navigator.clipboard.writeText(textToCopy);
  
  const copyBtn = document.getElementById('copy-btn');
  const originalHtml = copyBtn.innerHTML;
  copyBtn.innerHTML = '<span style="color:#4ade80;font-size:12px;font-weight:600;">Copied!</span>';
  setTimeout(() => { copyBtn.innerHTML = originalHtml }, 1500)
})

document.addEventListener('DOMContentLoaded', () => {
  if (window.electronAPI && window.electronAPI.onAnswerLoading) {
    window.electronAPI.onAnswerLoading((message) => {
      const contentEl = document.querySelector('.content');
      const displayMsg = message || 'Analyzing screen...';
      contentEl.innerHTML = `<span style="color:#a1a1aa; font-style: italic;">${displayMsg}</span>`;
      lastCodeBlock = '';
    });
  }

  if (window.electronAPI && window.electronAPI.onAnswer) {
    window.electronAPI.onAnswer((data) => {
      const contentEl = document.querySelector('.content');
      if (data.error) {
        contentEl.innerHTML = `<span style="color:#f87171;">${escapeHtml(data.text)}</span>`;
        lastCodeBlock = '';
        return;
      }

      const rawText = data.text;
      const parts = rawText.split('```');
      
      if (parts.length >= 3) {
        let html = '';
        let extractedCode = '';
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 1) { // Code block
            const blockContent = parts[i];
            const firstNewlineIdx = blockContent.indexOf('\n'); 
            let code = blockContent;
            if (firstNewlineIdx !== -1) {
              code = blockContent.substring(firstNewlineIdx + 1);
            }
            code = code.trim();
            if (!extractedCode) extractedCode = code;
            
            html += `<div class="no-drag" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 12px 0; white-space: pre-wrap; font-size: 13px; color: #e2e8f0; user-select: text;"><code>${escapeHtml(code)}</code></div>`;
          } else {
            const textContent = parts[i].trim();
            if (textContent) {
              html += `<div class="no-drag" style="margin: 4px 0; line-height: 1.6; user-select: text;">${escapeHtml(textContent).replace(/\n/g, '<br/>')}</div>`;
            }
          }
        }
        contentEl.innerHTML = html;
        lastCodeBlock = extractedCode;
      } else {
        contentEl.innerHTML = `<div class="no-drag" style="user-select: text;">${escapeHtml(rawText).replace(/\n/g, '<br/>')}</div>`;
        lastCodeBlock = '';
      }
    });
  }
});

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
