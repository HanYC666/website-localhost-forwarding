const proxyForm = document.getElementById('proxyForm');
const targetInput = document.getElementById('target');
const portInput = document.getElementById('port');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusCard = document.getElementById('statusCard');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusDetails = document.getElementById('statusDetails');
const toastEl = document.getElementById('toast');

let statusInterval = null;

function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 4000);
}

async function updateStatus() {
    try {
        const res = await fetch('/api/status');
        const status = await res.json();

        if (status.running) {
            statusCard.classList.add('active');
            statusDot.style.backgroundColor = 'var(--success)';
            statusText.textContent = 'Status: Active';
            statusDetails.innerHTML = `Forwarding <a href="http://127.0.0.1:${status.port}" target="_blank">http://127.0.0.1:${status.port}</a> to <strong>${status.target}</strong>`;
            
            // Update inputs and buttons
            targetInput.value = status.target;
            portInput.value = status.port;
            targetInput.disabled = true;
            portInput.disabled = true;
            
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } else {
            statusCard.classList.remove('active');
            statusDot.style.backgroundColor = 'var(--text-secondary)';
            statusText.textContent = 'Status: Inactive';
            statusDetails.textContent = 'Enter a target URL and port, then click Start Proxy.';
            
            targetInput.disabled = false;
            portInput.disabled = false;
            
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
        }
    } catch (err) {
        console.error('Failed to fetch status:', err);
    }
}

proxyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const target = targetInput.value.trim();
    const port = portInput.value.trim();
    
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    
    try {
        const res = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, port })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message, 'success');
            await updateStatus();
        } else {
            showToast(data.error || 'Failed to start proxy', 'error');
        }
    } catch (err) {
        showToast('Network error while starting proxy', 'error');
        console.error(err);
    } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Proxy';
    }
});

stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    
    try {
        const res = await fetch('/api/stop', { method: 'POST' });
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message, 'success');
            await updateStatus();
        } else {
            showToast(data.error || 'Failed to stop proxy', 'error');
        }
    } catch (err) {
        showToast('Network error while stopping proxy', 'error');
        console.error(err);
    } finally {
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop Proxy';
    }
});

// Initialize status and start polling
updateStatus();
statusInterval = setInterval(updateStatus, 3000);
