// Beispiel: CPU‑Anzeige oben rechts
(function(){
    const el = document.createElement('div');
    Object.assign(el.style, {
        position:'absolute', top:'10px', right:'10px',
        padding:'4px 8px', background:'rgba(0,0,0,0.5)', color:'#fff', zIndex:1000
    });
    document.body.appendChild(el);
    function update() {
        const used = Game.cpu.getUsed().toFixed(2);
        const limit = Game.cpu.tickLimit;
        el.textContent = `CPU: ${used} / ${limit}`;
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
})();