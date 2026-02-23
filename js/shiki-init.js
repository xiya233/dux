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

            // Replace original pre
            wrapper.replaceChild(highlightedPre, pre);

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

    // YAML detection
    if (/^(\s*-\s+.*|^[\w\s]+:\s*(.+)?)$/m.test(code) && !/[{};]/.test(code)) {
        return 'yaml';
    }

    // JavaScript detection
    if (/(?:const|let|var|function|=>|document\.)\s+/im.test(code)) {
        return 'javascript';
    }

    // Python detection
    if (/(?:def|import|print\(|if __name__ ==)\s+/im.test(code)) {
        return 'python';
    }

    return 'text';
}
