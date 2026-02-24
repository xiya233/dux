import { createHighlighter } from 'https://esm.sh/shiki@3.22.0';

document.addEventListener('DOMContentLoaded', async () => {
    const preElements = document.querySelectorAll('pre');

    // Process only if there are <pre> elements that aren't already initialized
    const presToProcess = Array.from(preElements).filter(pre => !pre.hasAttribute('data-shiki'));
    if (presToProcess.length === 0) return;

    // We let CSS hide the pre tags initially (opacity: 0) to prevent FOUC

    // Synchronously create Mac wrappers and loading state
    presToProcess.forEach(pre => {
        let codeText = pre.textContent || '';
        const codeEl = pre.querySelector('code');
        const className = (codeEl && codeEl.className) || pre.className;
        const match = className && className.match(/language-([a-zA-Z0-9_-]+)/);

        let lang = (match && match[1]) ? match[1] : detectLanguage(codeText);
        pre.setAttribute('data-detected-lang', lang); // Store for later

        // Create Mac wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'shiki-container shiki-loading';

        const header = document.createElement('div');
        header.className = 'shiki-header';

        const dots = document.createElement('div');
        dots.className = 'shiki-mac-dots';
        dots.innerHTML = `
            <div class="shiki-mac-dot close"></div>
            <div class="shiki-mac-dot minimize"></div>
            <div class="shiki-mac-dot maximize"></div>
        `;

        const langLabel = document.createElement('div');
        langLabel.className = 'shiki-lang';
        langLabel.textContent = lang + ' - Shiki代码高亮加载中...';

        header.appendChild(dots);
        header.appendChild(langLabel);

        wrapper.appendChild(header);

        // Put original pre inside wrapper, give it basic padding
        pre.parentNode.replaceChild(wrapper, pre);
        wrapper.appendChild(pre);

        // Ensure the pre is visible inside the container but styled basic
        pre.style.opacity = '1';
        pre.style.padding = '12px';
        pre.style.margin = '0';
        pre.style.overflowX = 'auto';
        pre.style.color = '#abb2bf';
        pre.style.backgroundColor = 'transparent';
        pre.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
        pre.style.fontSize = '13px';
        pre.style.lineHeight = '1.5';

        wrapper.setAttribute('data-shiki', 'loading');
    });

    try {
        // Initialize highlighter with the required languages
        const highlighter = await createHighlighter({
            themes: ['monokai'],
            langs: ['nginx', 'json', 'yaml', 'toml', 'javascript', 'python', 'systemd', 'dotenv', 'apache', 'dockerfile', 'text'],
        });

        const wrappers = document.querySelectorAll('.shiki-container[data-shiki="loading"]');
        for (const wrapper of Array.from(wrappers)) {
            const pre = wrapper.querySelector('pre');
            if (!pre) continue;

            let codeText = pre.textContent || '';
            let lang = pre.getAttribute('data-detected-lang') || 'text';

            if (lang !== 'text' && !highlighter.getLoadedLanguages().includes(lang)) {
                try {
                    await highlighter.loadLanguage(lang);
                } catch (e) {
                    console.warn(`Shiki loadLanguage failed for '${lang}', falling back to text.`, e);
                    lang = 'text';
                }
            }

            const html = highlighter.codeToHtml(codeText, {
                lang: lang,
                theme: 'monokai'
            });

            // Create temporary container to hold the HTML from Shiki
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const highlightedPre = tempDiv.firstElementChild;
            highlightedPre.classList.add('shiki');

            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'shiki-copy-btn';
            copyBtn.setAttribute('title', '复制代码');
            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shiki-copy-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(codeText).then(() => {
                    copyBtn.classList.add('copied');
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shiki-copy-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shiki-copy-icon"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });

            // Replace original pre
            wrapper.replaceChild(highlightedPre, pre);
            wrapper.appendChild(copyBtn);

            // Update lang label
            const langLabel = wrapper.querySelector('.shiki-lang');
            if (langLabel) {
                langLabel.textContent = lang;
            }

            wrapper.classList.remove('shiki-loading');
            wrapper.setAttribute('data-shiki', 'true');
        }
    } catch (error) {
        console.error('Shiki highlighting failed:', error);
        // Fallback: restore opacity if failed
        const loaders = document.querySelectorAll('.shiki-loading pre');
        loaders.forEach(pre => {
            pre.style.opacity = '1';
        });
    }
});

function detectLanguage(code) {
    if (!code) return 'text';

    // Dockerfile detection
    if (/^((?:FROM|MAINTAINER|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|HEALTHCHECK|SHELL)\s+)/m.test(code)) {
        return 'dockerfile';
    }

    // Apache detection
    if (/<(?:VirtualHost|Directory|DirectoryMatch|Files|Location|IfModule)\b/i.test(code) || /^\s*(?:ServerName|DocumentRoot|RewriteEngine|RewriteRule|LoadModule)\s+/im.test(code)) {
        return 'apache';
    }

    // KDL detection
    // Matches node blocks (like domains, *, or IPs) followed by '{' AND contains KDL native booleans (#true/#false) or string-value nodes, WITHOUT Nginx/C-style semicolons.
    if (/^\s*(?:[a-zA-Z0-9_.,-]+|\*|"[^"]+")\s*\{/m.test(code) && (/\s+#(?:true|false|null)\b/.test(code) || /^\s+[a-zA-Z0-9_-]+\s+"[^"]+"/m.test(code)) && !/;\s*$/m.test(code)) {
        return 'kdl';
    }

    // Nginx detection
    if (/^\s*(server|location|upstream|worker_processes)\s*([{;]|\s+)/im.test(code) && !/<(?:VirtualHost|Directory)/i.test(code)) {
        return 'nginx';
    }

    // JSON detection
    if (/^\s*[\{\[]\s*"/.test(code)) {
        try {
            JSON.parse(code);
            return 'json';
        } catch (e) {
            // Might be malformed but still looks like JSON
            return 'json';
        }
    }

    // systemd (system-config) detection
    if (/^\s*\[(Unit|Service|Install|Socket|Timer|Mount|Path|Scope|Slice)\]/m.test(code) && /^[a-zA-Z0-9_-]+\s*=/m.test(code)) {
        return 'systemd';
    }

    // dotenv detection
    // Matches typical uppercase env vars like DB_HOST=localhost or PUID=1000
    if (/^[A-Z_][A-Z0-9_]*\s*=\s*.+/m.test(code) && !/[{};]/.test(code) && !/^\s*\[/m.test(code)) {
        return 'dotenv';
    }

    // TOML detection
    if (/^\s*\[\s*([\w.-]+)\s*\]/m.test(code) || /^[a-zA-Z0-9_-]+\s*=\s*.+/m.test(code)) {
        return 'toml';
    }

    // JavaScript detection
    if (/(?:\bconst\b|\blet\b|\bvar\b|\bfunction\b|=>|\bdocument\.)\s+/im.test(code) || /console\.log\(/im.test(code)) {
        return 'javascript';
    }

    // Python detection
    if (/(?:\bdef\s+\w+|\bimport\s+[\w.]+|\bfrom\s+[\w.]+\s+import\b|print\(|\bwith\s+[\w.(]+\s*as\s+|\bwith\s+open\s*\(|\bif\s+__name__\s*==|\belif\b|\byield\b|\bpass\b|\bTrue\b|\bFalse\b|\bNone\b|\bif\b[^:\n]+\belse\b|\[.*?for.*?in.*?\]|\.write\(|\.join\()/.test(code)) {
        return 'python';
    }

    // SQL detection
    if (/\b(?:SELECT\s+(?:.*?\s+FROM)?|INSERT\s+INTO|UPDATE\s+.*?\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/im.test(code)) {
        return 'sql';
    }

    // Nix detection
    if (/(?:\{.*?pkgs.*?\}|mkIf|mkMerge|mkOverride|builtins\.|let\s+.*?\s+in\s+)/is.test(code) || /^\s*\{.*(?:config|lib|pkgs|\.\.\.).*:\s*$/m.test(code)) {
        return 'nix';
    }

    // YAML detection
    // Matches root keys (e.g., config:, x-env: &env), array items (- item), or nested keys
    if (/^[a-zA-Z0-9_-]+:\s*(?:&[a-zA-Z0-9_-]+\s*)?$/m.test(code) || /^\s*-\s+[\w.-]+/m.test(code) || /^\s*[a-zA-Z0-9_.-]+:\s+.*$/m.test(code)) {
        // Reject if typical CSS lines (ending with ;) are found, otherwise consider it YAML
        if (!/;\s*$/m.test(code)) {
            return 'yaml';
        }
    }

    return 'text';
}
