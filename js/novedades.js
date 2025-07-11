<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>NOVEDADES BPEF - Parte Diario Oficial</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #222; margin: 0; padding: 0; }
    .container { max-width: 960px; margin: 30px auto; padding: 24px 18px 40px 18px; background: #fff; border-radius: 18px; box-shadow: 0 4px 24px #1876d110, 0 2px 8px #1876d120; }
    .titulo-principal { text-align: center; font-size: 2.2em; margin-bottom: 10px; letter-spacing: 2px; color: #1876d1; font-weight: bold; }
    .logo-bpef { width: 82px; height: auto; display: block; margin: 0 auto 8px auto; opacity: .92; }
    .instrucciones { color: #1976d2; background: #eaf1fa; padding: 12px 18px; margin: 16px 0 22px 0; border-left: 5px solid #1876d1; border-radius: 8px; font-size: 1.07em; }
    table { width: 100%; border-collapse: collapse; background: #fcfcff; margin-bottom: 24px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 6px #1876d115; }
    th, td { border: 1px solid #cad3e0; padding: 7px 9px; text-align: left; font-size: 1em; }
    th { background: #e8efff; font-weight: bold; color: #1749aa; letter-spacing: 1.2px; border-bottom: 2.5px solid #b9d2ff; }
    .seccion { margin-top: 36px; margin-bottom: 10px; font-size: 1.20em; color: #1876d1; letter-spacing: 1.2px; font-weight: bold; text-transform: uppercase; border-left: 5px solid #1976d2; padding-left: 12px; background: #eaf1fa; border-radius: 7px; box-shadow: 0 1px 4px #b0cdfa25; }
    .boton { display: inline-block; margin: 36px auto 0 auto; padding: 15px 38px; font-size: 1.15em; background: linear-gradient(90deg, #1876d1 80%, #00b4f1 100%); color: #fff; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px #1876d110; transition: background .18s, box-shadow .17s; }
    .boton:hover { background: linear-gradient(90deg, #1462b8 80%, #009ccc 100%); box-shadow: 0 4px 12px #1876d125; }
    input, select, textarea { font-size: 1em; font-family: inherit; border: 1.5px solid #bfd3ee; border-radius: 5px; padding: 5px 7px; margin-bottom: 1px; margin-top: 1px; background: #f8faff; color: #202f49; width: 100%; box-sizing: border-box; outline: none; transition: border .14s; }
    input:focus, textarea:focus, select:focus { border: 1.5px solid #1876d1; background: #f2f9ff; }
    .small { font-size: .98em; color: #888; margin-top: 3px; margin-bottom: 13px; }
    @media (max-width: 690px) { .container {padding: 6px 2vw;} .titulo-principal {font-size: 1.2em;} th, td {font-size: .98em; padding: 6px 3px;} .boton {font-size: 1em; padding: 10px 10px;} }
  </style>
</head>
<body>
<div class="container">
  <img class="logo-bpef" src="https://upload.wikimedia.org/wikipedia/commons/7/79/Escudo_de_la_Polic%C3%ADa_Nacional_de_Espa%C3%B1a.png" alt="Logo Policía">
  <div class="titulo-principal">NOVEDADES BPEF<br><span style="font-size: .8em; color:#3e5d89;">Parte Diario Oficial</span></div>
  <div class="instrucciones">
    <b>Instrucciones:</b><br>
    <ul>
      <li>Rellene todos los campos obligatorios. El responsable es el <b>carnet profesional (6 dígitos)</b>.</li>
      <li>Para campos vacíos, escriba "—" (guión largo).</li>
      <li>Cuando termine, pulse <b>Descargar DOCX oficial</b> y comparta el archivo tal cual, sin editarlo posteriormente.</li>
      <li><b>No use PDF ni imprima el parte. Solo se admiten archivos DOCX generados aquí.</b></li>
    </ul>
  </div>
  <form id="formNovedades">
    <div class="seccion">Datos Generales</div>
    <table>
      <tr>
        <th style="width: 22%">Fecha</th>
        <th style="width: 34%">Responsable (Carnet Prof.)</th>
        <th style="width: 44%">Unidad</th>
      </tr>
      <tr>
        <td><input type="date" name="fecha" required></td>
        <td><input type="text" name="responsable" required maxlength="6" pattern="\\d{6}" placeholder="Ej: 123456"></td>
        <td><input type="text" name="unidad" required placeholder="Ej: BPEF, CECOREX, Puerto..."></td>
      </tr>
    </table>
    <!-- GRUPO 1 -->
    <div class="seccion">GRUPO 1</div>
    <table>
      <tr>
        <th>#</th><th>Detenidos</th><th>Motivo</th><th>Nacionalidad</th><th>Diligencias</th><th>Observaciones</th>
      </tr>
      <tr><td>1</td><td><input name="g1_detenido1"></td><td><input name="g1_motivo1"></td><td><input name="g1_nac1"></td><td><input name="g1_dil1"></td><td><input name="g1_obs1"></td></tr>
      <tr><td>2</td><td><input name="g1_detenido2"></td><td><input name="g1_motivo2"></td><td><input name="g1_nac2"></td><td><input name="g1_dil2"></td><td><input name="g1_obs2"></td></tr>
      <tr><td>3</td><td><input name="g1_detenido3"></td><td><input name="g1_motivo3"></td><td><input name="g1_nac3"></td><td><input name="g1_dil3"></td><td><input name="g1_obs3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Expulsados</th><th>Nacionalidad</th><th>Diligencias</th><th>Conduc. Pos</th><th>Conduc. Neg</th><th>Observaciones</th>
      </tr>
      <tr><td><input name="g1_exp1"></td><td><input name="g1_exp_nac1"></td><td><input name="g1_exp_dil1"></td><td><input name="g1_exp_pos1"></td><td><input name="g1_exp_neg1"></td><td><input name="g1_exp_obs1"></td></tr>
      <tr><td><input name="g1_exp2"></td><td><input name="g1_exp_nac2"></td><td><input name="g1_exp_dil2"></td><td><input name="g1_exp_pos2"></td><td><input name="g1_exp_neg2"></td><td><input name="g1_exp_obs2"></td></tr>
      <tr><td><input name="g1_exp3"></td><td><input name="g1_exp_nac3"></td><td><input name="g1_exp_dil3"></td><td><input name="g1_exp_pos3"></td><td><input name="g1_exp_neg3"></td><td><input name="g1_exp_obs3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Exp. Frustradas</th><th>Nacionalidad</th><th>Diligencias</th><th>Motivo</th>
      </tr>
      <tr><td><input name="g1_expf1"></td><td><input name="g1_expf_nac1"></td><td><input name="g1_expf_dil1"></td><td><input name="g1_expf_motivo1"></td></tr>
      <tr><td><input name="g1_expf2"></td><td><input name="g1_expf_nac2"></td><td><input name="g1_expf_dil2"></td><td><input name="g1_expf_motivo2"></td></tr>
      <tr><td><input name="g1_expf3"></td><td><input name="g1_expf_nac3"></td><td><input name="g1_expf_dil3"></td><td><input name="g1_expf_motivo3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Fletados</th><th>Destino</th><th>Nº Pax</th><th>Observaciones</th>
      </tr>
      <tr><td><input name="g1_fletado1"></td><td><input name="g1_flet_dest1"></td><td><input name="g1_flet_pax1"></td><td><input name="g1_flet_obs1"></td></tr>
      <tr><td><input name="g1_fletado2"></td><td><input name="g1_flet_dest2"></td><td><input name="g1_flet_pax2"></td><td><input name="g1_flet_obs2"></td></tr>
      <tr><td><input name="g1_fletado3"></td><td><input name="g1_flet_dest3"></td><td><input name="g1_flet_pax3"></td><td><input name="g1_flet_obs3"></td></tr>
    </table>
    <table>
      <tr><th>Gestiones</th></tr>
      <tr><td><input name="g1_gest1"></td></tr>
      <tr><td><input name="g1_gest2"></td></tr>
      <tr><td><input name="g1_gest3"></td></tr>
    </table>

    <!-- GRUPO 4 -->
    <div class="seccion">GRUPO 4</div>
    <table>
      <tr>
        <th>Nº Detenidos</th><th>Motivo</th><th>Nacionalidad</th><th>Diligencias</th><th>Observaciones</th>
      </tr>
      <tr><td><input name="g4_numdet1"></td><td><input name="g4_motivo1"></td><td><input name="g4_nac1"></td><td><input name="g4_dil1"></td><td><input name="g4_obs1"></td></tr>
      <tr><td><input name="g4_numdet2"></td><td><input name="g4_motivo2"></td><td><input name="g4_nac2"></td><td><input name="g4_dil2"></td><td><input name="g4_obs2"></td></tr>
      <tr><td><input name="g4_numdet3"></td><td><input name="g4_motivo3"></td><td><input name="g4_nac3"></td><td><input name="g4_dil3"></td><td><input name="g4_obs3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Identificados</th><th>Citados CECOREX</th><th>Citados UCRIF</th><th>Observaciones</th>
      </tr>
      <tr><td><input name="g4_ident1"></td><td><input name="g4_cecorex1"></td><td><input name="g4_ucrif1"></td><td><input name="g4_obsident1"></td></tr>
      <tr><td><input name="g4_ident2"></td><td><input name="g4_cecorex2"></td><td><input name="g4_ucrif2"></td><td><input name="g4_obsident2"></td></tr>
      <tr><td><input name="g4_ident3"></td><td><input name="g4_cecorex3"></td><td><input name="g4_ucrif3"></td><td><input name="g4_obsident3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Colaboración</th><th>Unidad C.</th><th>Resultado C.</th>
      </tr>
      <tr><td><input name="g4_colab1"></td><td><input name="g4_unidad1"></td><td><input name="g4_result1"></td></tr>
      <tr><td><input name="g4_colab2"></td><td><input name="g4_unidad2"></td><td><input name="g4_result2"></td></tr>
      <tr><td><input name="g4_colab3"></td><td><input name="g4_unidad3"></td><td><input name="g4_result3"></td></tr>
    </table>
    <table>
      <tr>
        <th>Ins. Trabajo</th><th>Lugar Ins.</th><th>Resultado Ins.</th>
      </tr>
      <tr><td><input name="g4_inst1"></td><td><input name="g4_lugar1"></td><td><input name="g4_resultins1"></td></tr>
      <tr><td><input name="g4_inst2"></td><td><input name="g4_lugar2"></td><td><input name="g4_resultins2"></td></tr>
      <tr><td><input name="g4_inst3"></td><td><input name="g4_lugar3"></td><td><input name="g4_resultins3"></td></tr>
    </table>
    <table>
      <tr><th>Gestiones Varias</th></tr>
      <tr><td><input name="g4_gvarias1"></td></tr>
      <tr><td><input name="g4_gvarias2"></td></tr>
      <tr><td><input name="g4_gvarias3"></td></tr>
    </table>

    <!-- PUERTO -->
    <div class="seccion">PUERTO</div>
    <table>
      <tr>
        <th>Ctrl. Marinos</th><th>Marinos Argos</th><th>Cruceros</th><th>Cruceristas</th>
      </tr>
      <tr>
        <td><input name="puerto_ctrl"></td>
        <td><input name="puerto_argos"></td>
        <td><input name="puerto_cruceros"></td>
        <td><input name="puerto_cruceristas"></td>
      </tr>
    </table>
    <table>
      <tr>
        <th>Visas CG</th><th>Visas VAL</th><th>Visas EXP</th><th>Veh. Chequeados</th><th>Pers. Chequeadas</th>
      </tr>
      <tr>
        <td><input name="puerto_visacg"></td>
        <td><input name="puerto_visaval"></td>
        <td><input name="puerto_visaexp"></td>
        <td><input name="puerto_veh"></td>
        <td><input name="puerto_pers"></td>
      </tr>
    </table>
    <table>
      <tr>
        <th>Detenidos</th><th>Denegaciones</th><th>Entr. Excep</th><th>Eixics</th><th>Ptos. Deportivos</th>
      </tr>
      <tr>
        <td><input name="puerto_det"></td>
        <td><input name="puerto_deneg"></td>
        <td><input name="puerto_entex"></td>
        <td><input name="puerto_eixics"></td>
        <td><input name="puerto_ptos"></td>
      </tr>
    </table>
    <table>
      <tr>
        <th>Ferrys</th><th>Destino</th><th>Hora</th><th>Pasajeros</th><th>Vehículos</th><th>Incidencias</th>
      </tr>
      <tr><td><input name="puerto_ferry1"></td><td><input name="puerto_dest1"></td><td><input name="puerto_hora1"></td><td><input name="puerto_pasaj1"></td><td><input name="puerto_vehic1"></td><td><input name="puerto_incid1"></td></tr>
      <tr><td><input name="puerto_ferry2"></td><td><input name="puerto_dest2"></td><td><input name="puerto_hora2"></td><td><input name="puerto_pasaj2"></td><td><input name="puerto_vehic2"></td><td><input name="puerto_incid2"></td></tr>
      <tr><td><input name="puerto_ferry3"></td><td><input name="puerto_dest3"></td><td><input name="puerto_hora3"></td><td><input name="puerto_pasaj3"></td><td><input name="puerto_vehic3"></td><td><input name="puerto_incid3"></td></tr>
    </table>
  </form>
  <button class="boton" onclick="exportDocx()">Descargar DOCX oficial</button>
</div>

<script src="https://unpkg.com/docx@7.8.0/build/index.umd.js"></script>
<script>
function exportDocx() {
  try {
    const f = document.getElementById('formNovedades');
    if (!f.fecha.value || !f.responsable.value || !f.unidad.value) {
      alert('Rellena los datos generales antes de exportar.');
      return;
    }
    const docTables = [];
    // 1. Datos Generales
    docTables.push([
      [{text: 'FECHA', bold: true}, {text: 'RESPONSABLE', bold: true}, {text: 'UNIDAD', bold: true}],
      [f.fecha.value, f.responsable.value, f.unidad.value]
    ]);
    // 2. GRUPO 1 - Detenidos
    docTables.push([
      [
        {text: '#', bold: true}, {text: 'DETENIDOS', bold: true}, {text: 'MOTIVO', bold: true}, {text: 'NACIONALIDAD', bold: true}, {text: 'DILIGENCIAS', bold: true}, {text: 'OBSERVACIONES', bold: true}
      ],
      ...[1,2,3].map(i=>[
        i,
        f[`g1_detenido${i}`]?.value || "",
        f[`g1_motivo${i}`]?.value || "",
        f[`g1_nac${i}`]?.value || "",
        f[`g1_dil${i}`]?.value || "",
        f[`g1_obs${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'EXPULSADOS', bold: true}, {text: 'NACIONALIDAD', bold: true}, {text: 'DILIGENCIAS', bold: true}, {text: 'CONDUC. POS', bold: true}, {text: 'CONDUC. NEG', bold: true}, {text: 'OBSERVACIONES', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g1_exp${i}`]?.value || "",
        f[`g1_exp_nac${i}`]?.value || "",
        f[`g1_exp_dil${i}`]?.value || "",
        f[`g1_exp_pos${i}`]?.value || "",
        f[`g1_exp_neg${i}`]?.value || "",
        f[`g1_exp_obs${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'EXP. FRUSTRADAS', bold: true}, {text: 'NACIONALIDAD', bold: true}, {text: 'DILIGENCIAS', bold: true}, {text: 'MOTIVO', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g1_expf${i}`]?.value || "",
        f[`g1_expf_nac${i}`]?.value || "",
        f[`g1_expf_dil${i}`]?.value || "",
        f[`g1_expf_motivo${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'FLETADOS', bold: true}, {text: 'DESTINO', bold: true}, {text: 'Nº PAX', bold: true}, {text: 'OBSERVACIONES', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g1_fletado${i}`]?.value || "",
        f[`g1_flet_dest${i}`]?.value || "",
        f[`g1_flet_pax${i}`]?.value || "",
        f[`g1_flet_obs${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [{text: 'GESTIONES', bold: true}],
      ...[1,2,3].map(i=>[
        f[`g1_gest${i}`]?.value || ""
      ])
    ]);
    // 3. GRUPO 4
    docTables.push([
      [
        {text: 'Nº DETENIDOS', bold: true}, {text: 'MOTIVO', bold: true}, {text: 'NACIONALIDAD', bold: true}, {text: 'DILIGENCIAS', bold: true}, {text: 'OBSERVACIONES', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g4_numdet${i}`]?.value || "",
        f[`g4_motivo${i}`]?.value || "",
        f[`g4_nac${i}`]?.value || "",
        f[`g4_dil${i}`]?.value || "",
        f[`g4_obs${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'IDENTIFICADOS', bold: true}, {text: 'CITADOS CECOREX', bold: true}, {text: 'CITADOS UCRIF', bold: true}, {text: 'OBSERVACIONES', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g4_ident${i}`]?.value || "",
        f[`g4_cecorex${i}`]?.value || "",
        f[`g4_ucrif${i}`]?.value || "",
        f[`g4_obsident${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'COLABORACIÓN', bold: true}, {text: 'UNIDAD C.', bold: true}, {text: 'RESULTADO C.', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g4_colab${i}`]?.value || "",
        f[`g4_unidad${i}`]?.value || "",
        f[`g4_result${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [
        {text: 'INS. TRABAJO', bold: true}, {text: 'LUGAR INS.', bold: true}, {text: 'RESULTADO INS.', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`g4_inst${i}`]?.value || "",
        f[`g4_lugar${i}`]?.value || "",
        f[`g4_resultins${i}`]?.value || ""
      ])
    ]);
    docTables.push([
      [{text: 'GESTIONES VARIAS', bold: true}],
      ...[1,2,3].map(i=>[
        f[`g4_gvarias${i}`]?.value || ""
      ])
    ]);
    // 4. PUERTO
    docTables.push([
      [
        {text: 'CTRL. MARINOS', bold: true}, {text: 'MARINOS ARGOS', bold: true}, {text: 'CRUCEROS', bold: true}, {text: 'CRUCERISTAS', bold: true}
      ],
      [
        f.puerto_ctrl?.value || "",
        f.puerto_argos?.value || "",
        f.puerto_cruceros?.value || "",
        f.puerto_cruceristas?.value || ""
      ]
    ]);
    docTables.push([
      [
        {text: 'VISAS CG', bold: true}, {text: 'VISAS VAL', bold: true}, {text: 'VISAS EXP', bold: true}, {text: 'VEH. CHEQUEADOS', bold: true}, {text: 'PERS. CHEQUEADAS', bold: true}
      ],
      [
        f.puerto_visacg?.value || "",
        f.puerto_visaval?.value || "",
        f.puerto_visaexp?.value || "",
        f.puerto_veh?.value || "",
        f.puerto_pers?.value || ""
      ]
    ]);
    docTables.push([
      [
        {text: 'DETENIDOS', bold: true}, {text: 'DENEGACIONES', bold: true}, {text: 'ENTR. EXCEP', bold: true}, {text: 'EIXICS', bold: true}, {text: 'PTOS. DEPORTIVOS', bold: true}
      ],
      [
        f.puerto_det?.value || "",
        f.puerto_deneg?.value || "",
        f.puerto_entex?.value || "",
        f.puerto_eixics?.value || "",
        f.puerto_ptos?.value || ""
      ]
    ]);
    docTables.push([
      [
        {text: 'FERRYS', bold: true}, {text: 'DESTINO', bold: true}, {text: 'HORA', bold: true}, {text: 'PASAJEROS', bold: true}, {text: 'VEHÍCULOS', bold: true}, {text: 'INCIDENCIAS', bold: true}
      ],
      ...[1,2,3].map(i=>[
        f[`puerto_ferry${i}`]?.value || "",
        f[`puerto_dest${i}`]?.value || "",
        f[`puerto_hora${i}`]?.value || "",
        f[`puerto_pasaj${i}`]?.value || "",
        f[`puerto_vehic${i}`]?.value || "",
        f[`puerto_incid${i}`]?.value || ""
      ])
    ]);
    // --- DOCX generación
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } = window.docx;
    function makeTable(tbl, idx) {
      return new Table({
        rows: tbl.map((row, i) =>
          new TableRow({
            children: row.map(cell =>
              new TableCell({
                children: [new Paragraph({
                  children: [typeof cell==="object" ? new TextRun({text:cell.text, bold:!!cell.bold}) : new TextRun(cell+"")]
                })],
                width: { size: 100/row.length*100, type: WidthType.PERCENTAGE }
              })
            ),
            tableHeader: i === 0
          })
        ),
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER
      });
    }
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: "NOVEDADES BPEF - PARTE DIARIO OFICIAL",
            heading: "HEADING_1",
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          ...docTables.map((t,i)=>makeTable(t,i))
        ]
      }]
    });
    Packer.toBlob(doc).then(blob => {
      const filename = "NOVEDADES_BPEF_" + (f.fecha.value || "parte") + ".docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
    });
  } catch (e) {
    alert("Error generando el DOCX. Revisa que el navegador permite scripts o recarga la página.");
    console.error(e);
  }
}
</script>
</body>
</html>
