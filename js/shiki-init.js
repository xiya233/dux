import { createHighlighter } from 'https://esm.sh/shiki@3.22.0';

document.addEventListener('DOMContentLoaded', async () => {
    const preElements = document.querySelectorAll('pre');

    // Process only if there are <pre> elements that aren't already initialized
    const presToProcess = Array.from(preElements).filter(pre => !pre.hasAttribute('data-shiki'));
    if (presToProcess.length === 0) return;

    // Optional: Add a loading state
    presToProcess.forEach(pre => {
        pre.style.opacity = '0.5';
    });

    try {
        // Initialize highlighter with the required languages
        const highlighter = await createHighlighter({
            themes: ['monokai'],
            langs: ['nginx', 'json', 'yaml', 'toml', 'javascript', 'python', 'systemd', 'dotenv', 'apache', 'dockerfile', 'text'],
        });

        for (const pre of presToProcess) {
            let codeText = pre.textContent || '';
            let lang = detectLanguage(codeText);

            const html = highlighter.codeToHtml(codeText, {
                lang: lang,
                theme: 'monokai'
            });

            // Create Mac wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'shiki-container';

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
            langLabel.textContent = lang;

            header.appendChild(dots);
            header.appendChild(langLabel);

            wrapper.appendChild(header);

            // Create temporary container to hold the HTML from Shiki
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const highlightedPre = tempDiv.firstElementChild;
            highlightedPre.classList.add('shiki');

            wrapper.appendChild(highlightedPre);

            // Replace original pre
            pre.parentNode.replaceChild(wrapper, pre);
            wrapper.setAttribute('data-shiki', 'true');
        }
    } catch (error) {
        console.error('Shiki highlighting failed:', error);
        // Fallback: restore opacity if failed
        presToProcess.forEach(pre => {
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
