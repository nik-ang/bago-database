window.onload = function() {
    Particles.init({
        selector: '.particlescanvas',
        maxParticles: 240,
        connectParticles: true,
        color: ['#ef00ec', '#8c0048'],
        speed: 1,
        minDistance: 100,
        sizeVariations: 5,
        
        responsive: [{
            breakpoint: 425,
            options: {
                maxParticles: 60,
                connectParticles: true
            }
        }, {
            breakpoint: 320,
            options: {
                maxParticles: 0

                // disables particles.js
            }
        }],
    });
}