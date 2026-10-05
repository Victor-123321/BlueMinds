// wwwroot/js/vark-chart.js
// Chart.js radar chart for VARK learning style visualization

window.initVarkChart = function(canvasId, visual, auditivo, lectoescritura, kinestesico) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded');
        return;
    }

    // Destroy existing chart if it exists
    if (window.varkChartInstance) {
        window.varkChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    window.varkChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Visual 👁️', 'Auditivo 👂', 'Lectoescritura 📖', 'Kinestésico ✋'],
            datasets: [{
                label: 'Desempeño',
                data: [visual, auditivo, lectoescritura, kinestesico],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 3,
                pointRadius: 6,
                pointBackgroundColor: 'rgb(59, 130, 246)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.r.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 25,
                        backdropColor: 'transparent',
                        color: 'rgb(100, 116, 139)',
                        font: {
                            size: 11,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        circular: true
                    },
                    pointLabels: {
                        color: 'rgb(51, 65, 85)',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
};
