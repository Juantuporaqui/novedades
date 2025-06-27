<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIREX - Carga de Novedades DOCX</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { background-color: #f0f2f5; font-family: 'Inter', sans-serif; }
        .upload-card {
            max-width: 700px;
            margin: 4rem auto;
            border: 3px dashed #0d6efd;
            border-radius: 1rem;
            background-color: #fff;
            transition: all 0.3s ease;
        }
        .upload-card:hover {
            border-color: #0a58ca;
            transform: translateY(-5px);
        }
        .upload-icon {
            font-size: 5rem;
            color: #0d6efd;
        }
        .form-container {
            border: 1px solid #dee2e6;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 1rem;
            background-color: #f8f9fa;
        }
    </style>
</head>
<body>

    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div class="container">
            <span class="navbar-brand fs-4 fw-bold">SIREX · Carga de Novedades desde DOCX</span>
        </div>
    </nav>

    <div class="container">
        <div class="card shadow-sm upload-card">
            <div class="card-body text-center p-5">
                <i class="bi bi-file-earmark-word-fill upload-icon"></i>
                <h2 class="card-title mt-3">Carga de Novedades</h2>
                <p class="text-muted">Selecciona el archivo DOCX de novedades del día. El sistema leerá los datos y los mostrará para tu confirmación.</p>
                <button type="button" class="btn btn-primary btn-lg mt-3" onclick="document.getElementById('inputDocx').click();">
                    <i class="bi bi-upload"></i> Seleccionar Archivo DOCX
                </button>
                <input type="file" id="inputDocx" class="d-none" accept=".docx">
            </div>
        </div>
        
        <div id="formularios-container" class="mt-4">
            <!-- Los formularios autocompletados aparecerán aquí -->
        </div>

    </div>
    
    <!-- Librerías JS -->
    <!-- Mammoth.js para leer DOCX -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
    
    <!-- Tu script principal, cargado como módulo -->
    <script type="module" src="js/novedades.js"></script>

</body>
</html>
