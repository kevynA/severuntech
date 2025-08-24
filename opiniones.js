// ===== CONFIGURACIÓN DE SHEETDB =====
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/g8mnxeu3et3kz';

// ===== SISTEMA DE OPINIONES CON EXCEL =====
let adminClickCount = 0;

// Configuración inicial cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    // Cargar opiniones existentes
    loadTestimonials();
    
    // Configurar estrellas de calificación
    setupStarRating();
    
    // Manejar envío del formulario
    const testimonialForm = document.getElementById('testimonial-form');
    if (testimonialForm) {
        testimonialForm.addEventListener('submit', handleTestimonialSubmit);
    }
    
    // Configurar el panel de administración
    setupAdminPanel();
    
    // Configurar botones de administración
    const downloadBtn = document.getElementById('download-excel');
    const refreshBtn = document.getElementById('refresh-opinions');
    
    if (downloadBtn) downloadBtn.addEventListener('click', downloadExcel);
    if (refreshBtn) refreshBtn.addEventListener('click', loadTestimonials);
});

function setupStarRating() {
    const stars = document.querySelectorAll('.star-rating');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            document.getElementById('rating').value = rating;
            
            // Actualizar visualización de estrellas
            stars.forEach(s => {
                const starRating = parseInt(s.getAttribute('data-rating'));
                s.textContent = starRating <= rating ? '★' : '☆';
            });
        });
        
        star.addEventListener('mouseover', function() {
            const hoverRating = parseInt(this.getAttribute('data-rating'));
            
            stars.forEach(s => {
                const starRating = parseInt(s.getAttribute('data-rating'));
                s.textContent = starRating <= hoverRating ? '★' : '☆';
            });
        });
        
        star.addEventListener('mouseout', function() {
            const currentRating = parseInt(document.getElementById('rating').value);
            
            stars.forEach(s => {
                const starRating = parseInt(s.getAttribute('data-rating'));
                s.textContent = starRating <= currentRating ? '★' : '☆';
            });
        });
    });
}

function setupAdminPanel() {
    // Acceso al panel de administración con 5 clics en el título
    const title = document.querySelector('#testimonials h2');
    if (title) {
        title.addEventListener('click', function() {
            adminClickCount++;
            if (adminClickCount >= 5) {
                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) {
                    adminPanel.classList.remove('hidden');
                    adminClickCount = 0;
                    setTimeout(() => {
                        adminPanel.classList.add('hidden');
                    }, 10000);
                }
            }
        });
    }
}

function handleTestimonialSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const rating = document.getElementById('rating').value;
    const message = document.getElementById('message').value;
    
    if (rating === "0") {
        alert('Por favor selecciona una calificación');
        return;
    }
    
    // Crear objeto con los datos del testimonio
    const testimonial = {
        id: Date.now(),
        name,
        email,
        rating: parseInt(rating),
        message,
        date: new Date().toISOString(),
        // CORRECCIÓN: Usar "aprovado" en lugar de "aprobado"
        approved: false
    };
    
    // Guardar en SheetDB (Excel en la nube)
    saveTestimonialToSheetDB(testimonial);
}

function saveTestimonialToSheetDB(testimonial) {
    fetch(SHEETDB_API_URL, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: [
                {
                    'id': testimonial.id,
                    'nombre': testimonial.name,
                    'email': testimonial.email,
                    'calificacion': testimonial.rating,
                    'mensaje': testimonial.message,
                    'fecha': testimonial.date,
                    // CORRECCIÓN: Usar "aprovado" en lugar de "aprobado"
                    'aprovado': testimonial.approved ? 'Sí' : 'No'
                }
            ]
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la respuesta de la API');
        }
        return response.json();
    })
    .then(data => {
        // Mostrar mensaje de éxito
        alert('¡Gracias por tu opinión! Será revisada y publicada pronto.');
        document.getElementById('testimonial-form').reset();
        document.getElementById('rating').value = "0";
        
        // Resetear estrellas
        document.querySelectorAll('.star-rating').forEach(star => {
            star.textContent = '☆';
        });
        
        // Recargar testimonios
        loadTestimonials();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Hubo un error al enviar tu opinión. Por favor intenta nuevamente.');
        
        // Guardar en localStorage como respaldo
        saveTestimonialToLocalStorage(testimonial);
    });
}

function saveTestimonialToLocalStorage(testimonial) {
    // Obtener testimonios existentes
    let testimonials = JSON.parse(localStorage.getItem('severuntech_testimonials')) || [];
    
    // Agregar el nuevo testimonio
    testimonials.push(testimonial);
    
    // Guardar en localStorage
    localStorage.setItem('severuntech_testimonials', JSON.stringify(testimonials));
}

function loadTestimonials() {
    console.log('Cargando testimonios desde SheetDB...');
    
    // Primero intentar cargar desde SheetDB
    fetch(SHEETDB_API_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar desde SheetDB: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos de SheetDB:', data);
            
            // CORRECCIÓN: Usar "aprovado" en lugar de "aprobado"
            const approvedTestimonials = data.filter(item => 
                item.aprovado && item.aprovado.toString().toLowerCase() === 'sí'
            );
            
            console.log('Testimonios aprobados:', approvedTestimonials);
            
            if (approvedTestimonials.length > 0) {
                displayTestimonials(approvedTestimonials);
            } else {
                // Si no hay testimonios aprobados, intentar cargar desde localStorage
                console.log('No hay testimonios aprobados en SheetDB, cargando desde localStorage...');
                loadFromLocalStorage();
            }
        })
        .catch(error => {
            console.error('Error al cargar desde SheetDB:', error);
            // Si hay error, cargar desde localStorage
            loadFromLocalStorage();
        });
}

function loadFromLocalStorage() {
    const testimonials = JSON.parse(localStorage.getItem('severuntech_testimonials')) || [];
    
    // Filtrar solo los aprobados para mostrar
    const approvedTestimonials = testimonials.filter(t => t.approved);
    
    // Si no hay testimonios aprobados, mostrar algunos de ejemplo
    if (approvedTestimonials.length === 0) {
        console.log('No hay testimonios en localStorage, mostrando ejemplos...');
        displayExampleTestimonials();
    } else {
        console.log('Testimonios desde localStorage:', approvedTestimonials);
        displayTestimonials(approvedTestimonials);
    }
}

function displayExampleTestimonials() {
    // Mostrar testimonios de ejemplo si no hay testimonios reales
    const exampleTestimonials = [
        {
            id: 1,
            nombre: "Carlos Rodríguez",
            calificacion: 5,
            mensaje: "Excelente servicio. Repararon mi laptop en menos de 24 horas y quedó como nueva. ¡Totalmente recomendados!",
            fecha: new Date().toISOString()
        },
        {
            id: 2,
            nombre: "María González",
            calificacion: 4,
            mensaje: "Compré el disco sólido y la diferencia de velocidad es increíble. Buen precio y atención de calidad.",
            fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 3,
            nombre: "Juan Pérez",
            calificacion: 5,
            mensaje: "Transformaron mi casa en un hogar inteligente. La instalación fue rápida y ahora controlo todo desde mi teléfono.",
            fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    
    displayTestimonials(exampleTestimonials);
}

function displayTestimonials(testimonials) {
    const container = document.getElementById('testimonials-container');
    
    if (!container) {
        console.error('No se encontró el contenedor de testimonios');
        return;
    }
    
    if (testimonials.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 col-span-full">
                <i class="fas fa-comment-slash text-3xl text-secondary"></i>
                <p class="mt-2">Aún no hay opiniones. ¡Sé el primero en comentar!</p>
            </div>
        `;
        return;
    }
    
    // Ordenar testimonios por fecha (más recientes primero)
    testimonials.sort((a, b) => {
        const dateA = new Date(a.fecha || a.date);
        const dateB = new Date(b.fecha || b.date);
        return dateB - dateA;
    });
    
    container.innerHTML = testimonials.map(testimonial => `
        <div class="testimonial-card rounded-xl p-6">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-white font-bold mr-3">
                    ${(testimonial.nombre || testimonial.name).charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 class="font-semibold">${testimonial.nombre || testimonial.name}</h4>
                    <div class="star-rating text-sm">
                        ${'★'.repeat(testimonial.calificacion || testimonial.rating)}${'☆'.repeat(5 - (testimonial.calificacion || testimonial.rating))}
                    </div>
                </div>
            </div>
            <p class="text-sm italic">"${testimonial.mensaje || testimonial.message}"</p>
            <div class="mt-4 text-xs text-gray-300">
                ${new Date(testimonial.fecha || testimonial.date).toLocaleDateString('es-ES')}
            </div>
        </div>
    `).join('');
}

function downloadExcel() {
    // Crear un enlace temporal para descargar el Excel
    const link = document.createElement('a');
    link.href = `${SHEETDB_API_URL}?download=1`;
    link.target = '_blank';
    link.download = 'opiniones_clientes_severuntech.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
