/*
 * src/config/groups.js
 * =====================
 * Define los grupos o módulos principales de la aplicación.
 * Esta configuración se utiliza para generar menús de navegación y rutas.
 */

export const groups = {
    grupo1: {
        id: 'grupo1',
        name: 'Grupo 1',
        description: 'Gestión de Expedientes de Expulsión',
        icon: '🚷'
    },
    grupo2: {
        id: 'grupo2',
        name: 'Grupo 2',
        description: 'Investigación y Operaciones',
        icon: '🕵️‍♂️'
    },
    grupo3: {
        id: 'grupo3',
        name: 'Grupo 3',
        description: 'Control y Seguimiento Operativo',
        icon: '👮‍♂️'
    },
    puerto: {
        id: 'puerto',
        name: 'Puerto',
        description: 'Controles y Actuaciones Portuarias',
        icon: '⚓'
    },
    cie: {
        id: 'cie',
        name: 'CIE',
        description: 'Gestión del Centro de Internamiento',
        icon: '🏢'
    },
    gestion: {
        id: 'gestion',
        name: 'Gestión',
        description: 'Trámites de Asilo, Cartas y otros',
        icon: '🗂️'
    },
    // Añadiremos más grupos según sea necesario
};
