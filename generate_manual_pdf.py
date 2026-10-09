import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Paths
WORKSPACE_DIR = r"c:\Users\NOWEB  DESKTOP\Documents\ALIWEN GO"
DESKTOP_DIR = os.path.join(os.environ["USERPROFILE"], "Desktop")
OUTPUT_PDF_DESKTOP = os.path.join(DESKTOP_DIR, "Manual_Aliwen_Go_Tutorial.pdf")
OUTPUT_PDF_LOCAL = os.path.join(WORKSPACE_DIR, "Manual_Aliwen_Go_Tutorial.pdf")
LOGO_PATH = os.path.join(WORKSPACE_DIR, "public", "logo_green.png")

# Palette definition
COLOR_PRIMARY = colors.HexColor("#1A3826")      # Forest Green Aliwen
COLOR_PRIMARY_LIGHT = colors.HexColor("#234B34")
COLOR_BG_SAGE = colors.HexColor("#EBF2ED")      # Soft Sage
COLOR_BORDER_SAGE = colors.HexColor("#C5DBCB")
COLOR_TEXT_DARK = colors.HexColor("#1A202C")
COLOR_TEXT_MUTED = colors.HexColor("#4A5568")
COLOR_BG_LIGHT = colors.HexColor("#F8FAFC")
COLOR_BORDER_LIGHT = colors.HexColor("#E2E8F0")

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Página X de Y'
    along with clean luxury running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_w, page_h = letter
        margin = 40

        # Running header on pages 2 and beyond
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_PRIMARY)
            self.drawString(margin, page_h - 26, "REFUGIO ALIWEN SPA")
            self.setFont("Helvetica", 8)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawString(margin + 105, page_h - 26, "— Manual de Agendamiento y Operación Web")
            self.drawRightString(page_w - margin, page_h - 26, "www.go.refugioaliwenspa.cl")

            self.setStrokeColor(COLOR_BORDER_LIGHT)
            self.setLineWidth(0.6)
            self.line(margin, page_h - 32, page_w - margin, page_h - 32)

        # Running footer on all pages
        self.setStrokeColor(COLOR_BORDER_LIGHT)
        self.setLineWidth(0.6)
        self.line(margin, 34, page_w - margin, 34)

        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(margin, 22, "Refugio Aliwen Spa · WhatsApp: 9 9459 7751 · www.refugioaliwenspa.cl")

        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(page_w - margin, 22, page_str)

        self.restoreState()


def build_manual_pdf(target_path):
    doc = SimpleDocTemplate(
        target_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=42,
    )

    content_width = letter[0] - 80  # 532 pt

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=COLOR_PRIMARY,
        alignment=1,
        spaceAfter=3,
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=COLOR_TEXT_MUTED,
        alignment=1,
        spaceAfter=10,
    )

    h1_style = ParagraphStyle(
        "SecH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=COLOR_PRIMARY,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "SecH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=COLOR_PRIMARY_LIGHT,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=COLOR_TEXT_DARK,
        spaceAfter=4,
    )

    callout_text = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=COLOR_PRIMARY,
    )

    badge_text = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=1,
    )

    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=COLOR_PRIMARY,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=COLOR_TEXT_DARK,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName="Helvetica-Bold",
        textColor=COLOR_PRIMARY,
    )

    story = []

    # ==========================================
    # PÁGINA 1: PORTADA & DOCUMENTACIÓN TÉCNICA
    # ==========================================
    if os.path.exists(LOGO_PATH):
        logo_w = 115
        logo_h = logo_w / 1.571
        logo_img = RLImage(LOGO_PATH, width=logo_w, height=logo_h)
        logo_img.hAlign = "CENTER"
        story.append(logo_img)
        story.append(Spacer(1, 6))

    story.append(Paragraph("MANUAL DE USUARIO Y GUÍA DE ADMINISTRACIÓN", title_style))
    story.append(Paragraph("Plataforma Oficial de Agendamiento, Pagos Webpay y Gestión de Reservas", subtitle_style))

    # Links table
    links_data = [
        [
            Paragraph("<b>Sitio Web Oficial:</b> <font color='#1A3826'><u>https://www.refugioaliwenspa.cl</u></font>", table_cell),
            Paragraph("<b>Pasarela de Pagos:</b> Flow.cl Webpay Plus (Producción)", table_cell),
        ],
        [
            Paragraph("<b>App de Agendamiento:</b> <font color='#1A3826'><u>https://www.go.refugioaliwenspa.cl</u></font>", table_cell),
            Paragraph("<b>WhatsApp Oficial:</b> <b>+56 9 9459 7751</b>", table_cell),
        ],
        [
            Paragraph("<b>Panel Administrativo:</b> <font color='#1A3826'><u>https://www.go.refugioaliwenspa.cl/admin</u></font>", table_cell),
            Paragraph("<b>Correo Contacto:</b> contacto@refugioaliwenspa.cl", table_cell),
        ],
    ]
    t_links = Table(links_data, colWidths=[content_width * 0.52, content_width * 0.48])
    t_links.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_SAGE),
        ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER_SAGE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_links)
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. Documentación Técnica y Arquitectura de la Solución", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceAfter=5, spaceBefore=1))

    story.append(Paragraph(
        "Esta sección resume la ingeniería de software y las integraciones implementadas en la plataforma web de Refugio Aliwen Spa para garantizar una operación de pagos en producción robusta, confiable y segura.",
        body_style
    ))

    tech_items = [
        ("Pasarela de Pagos Flow en Producción",
         "Se integró la API oficial de Flow (<code>https://www.flow.cl/api</code>) en modo de producción activo mediante autenticación con <b>API Key</b> y <b>Secret Key</b>, firmando criptográficamente cada solicitud con <b>HMAC-SHA256</b>. Soporta tarjetas de débito (Redcompra), crédito en cuotas, CuentaRUT, prepago, OnePay y Mach."),
        
        ("Cabaña de Prueba de $350 CLP",
         "Se habilitó en el catálogo una cabaña exclusiva de verificación (<b>Cabaña Test $350</b>) tarificada a $350 CLP con abono al 100%, cumpliendo con la política de monto mínimo exigida por la pasarela Flow para permitir pruebas reales con tarjetas bancarias en cualquier momento."),
        
        ("Retorno Dinámico Garantizado (Sin Fugas a Sitios Externos)",
         "El backend detecta dinámicamente el host y puerto de origen del usuario al momento de reservar. Tras pagar en Flow, el endpoint <code>/api/flow/return</code> valida el token del banco, confirma la reserva y redirige al navegador vía <b>HTTP 303 + Script de reemplazo</b> directamente hacia la misma aplicación web (<code>/gracias?code=...</code>), eliminando desvíos indeseados a páginas externas."),

        ("Generador Automático de Comprobantes en PDF",
         "Se incorporó un motor de renderizado vectorial (<code>jsPDF</code>) que construye y descarga automáticamente en el navegador del cliente un voucher de agendamiento en PDF. Incluye código único (#ALW-XXXXX), fechas de entrada y salida, desglose de abono pagado y saldo en check-in, canal oficial de WhatsApp (9 9459 7751) e instrucciones de llegada."),

        ("Pantalla de Agradecimiento Ultra Limpia",
         "Diseñada con estética minimalista, libre de logotipos distractores, presentando de forma directa la confirmación de la reserva, el mensaje de contacto solicitado, el WhatsApp activo con enlace directo a chat y el disparador de descarga del comprobante."),

        ("Almacenamiento Redundante y Sincronización",
         "Las reservas y fechas bloqueadas se persisten en tiempo real en la base de datos central de PocketBase (<code>https://refugioaliwenspa.cl.automotrizregimiento.cl</code>) y cuentan con respaldo local tolerante a desconexiones en JSON para garantizar que ningún dato de pago se pierda."),
    ]

    tech_table_data = []
    for title, desc in tech_items:
        cell_p = Paragraph(f"<b>• {title}:</b> {desc}", body_style)
        tech_table_data.append([cell_p])

    t_tech = Table(tech_table_data, colWidths=[content_width])
    t_tech.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(t_tech)

    # Page Break to ensure Section 2 is cleanly on Page 2
    story.append(PageBreak())

    # ==========================================
    # PÁGINA 2: TUTORIAL DE USUARIO FINAL
    # ==========================================
    story.append(Paragraph("2. Tutorial de Usuario: Cómo Agendar y Cómo Pagar", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceAfter=5, spaceBefore=1))

    story.append(Paragraph(
        "A continuación se describe el paso a paso que realiza cualquier huésped o cliente para seleccionar una cabaña, agendar sus fechas de descanso y formalizar su pago en línea:",
        body_style
    ))

    user_steps = [
        ("Paso 1", "Ingreso al Portal Web",
         "El usuario entra a <b>www.go.refugioaliwenspa.cl</b> desde cualquier celular, tablet o computador con conexión a internet. La plataforma carga al instante."),

        ("Paso 2", "Selección de la Cabaña",
         "En la columna izquierda, el usuario revisa el catálogo de cabañas (Copihue, Canelo, Arrayán Deluxe, Roble Andino o Cabaña Test de $350 CLP). Hace clic sobre la que desea reservar y verá destacada su capacidad y valor por noche."),

        ("Paso 3", "Selección de Fechas en el Calendario",
         "En el calendario central interactivo, hace clic en el día de llegada (<b>Check-in</b> a las 15:00 hrs) y en el día de salida (<b>Check-out</b> a las 12:00 hrs). Los días ocupados se muestran tachados para evitar cualquier error. Puede sumar o restar noches con los botones (+) y (-)."),

        ("Paso 4", "Ingreso de Datos Personales",
         "En el formulario de agendamiento, ingresa su <b>Nombre y Apellido</b>, su <b>Teléfono móvil</b> (para la coordinación por WhatsApp) y su <b>Correo electrónico</b> para recibir las confirmaciones."),

        ("Paso 5", "Elección del Monto de Abono",
         "El cliente puede elegir pagar el <b>30%</b>, <b>50%</b> o el <b>100%</b> del valor total de su estadía. La pantalla le muestra en tiempo real cuánto abona en el momento y cuánto queda pendiente para cancelar al momento de ingresar al refugio.<br/><i>*Para la Cabaña Test de $350 CLP se aplica 100% para cumplir con el monto mínimo de Flow.</i>"),

        ("Paso 6", "Pago Seguro con Webpay Plus",
         "Presiona el botón verde <b>'Pagar con Flow Webpay'</b>. El sistema lo conecta de forma segura a Webpay Plus de Transbank donde podrá pagar con tarjeta de débito (Redcompra), crédito (con o sin cuotas), CuentaRUT o billeteras electrónicas."),

        ("Paso 7", "Confirmación y Descarga Automática de PDF",
         "Una vez autorizado el pago en su banco, el sistema lo devuelve automáticamente a una pantalla limpia que le indica:<br/>"
         "<b>'Muchas gracias por tu agendamiento. Nos vamos a comunicar contigo vía WhatsApp. 9 9459 7751'</b><br/>"
         "En ese mismo instante, su <b>comprobante oficial de agendamiento en PDF se descarga automáticamente</b> a su teléfono o computador."),

        ("Paso 8", "Coordinación de Llegada por WhatsApp",
         "En la pantalla final, el huésped cuenta con un botón directo para abrir un chat de WhatsApp al <b>+56 9 9459 7751</b> con su código de reserva listo para coordinar la hora de llegada, la entrega de llaves y el encendido de la tinaja a leña."),
    ]

    user_rows = []
    for step_num, step_title, step_desc in user_steps:
        col_badge = Paragraph(f"<b>{step_num}</b>", badge_text)
        col_content = Paragraph(f"<b>{step_title}:</b> {step_desc}", body_style)
        user_rows.append([col_badge, col_content])

    t_user = Table(user_rows, colWidths=[40, content_width - 40])
    t_user.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), COLOR_PRIMARY),
        ("BACKGROUND", (1, 0), (1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (1, 0), (1, -1), 6),
        ("RIGHTPADDING", (1, 0), (1, -1), 6),
    ]))
    story.append(t_user)
    story.append(Spacer(1, 8))

    # Cabins summary table
    cabins_header = [Paragraph("<b>Cabaña</b>", table_header), Paragraph("<b>Capacidad</b>", table_header), Paragraph("<b>Tarifa / Noche</b>", table_header), Paragraph("<b>Servicios Incluidos</b>", table_header)]
    cabins_data = [
        cabins_header,
        [Paragraph("Cabaña Test (Prueba)", table_cell_bold), Paragraph("2 pers.", table_cell), Paragraph("$350 CLP", table_cell), Paragraph("Modo prueba Flow en vivo", table_cell)],
        [Paragraph("Cabaña Copihue", table_cell_bold), Paragraph("2 pers.", table_cell), Paragraph("$85.000 CLP", table_cell), Paragraph("Tinaja a leña privada", table_cell)],
        [Paragraph("Cabaña Canelo", table_cell_bold), Paragraph("4 pers.", table_cell), Paragraph("$120.000 CLP", table_cell), Paragraph("Tinaja a leña privada", table_cell)],
        [Paragraph("Cabaña Arrayán Deluxe", table_cell_bold), Paragraph("3 pers.", table_cell), Paragraph("$145.000 CLP", table_cell), Paragraph("Hidromasaje & Tinaja a leña", table_cell)],
        [Paragraph("Cabaña Roble Andino", table_cell_bold), Paragraph("6 pers.", table_cell), Paragraph("$180.000 CLP", table_cell), Paragraph("Gran Tinaja a leña familiar", table_cell)],
    ]
    t_cabins = Table(cabins_data, colWidths=[content_width * 0.28, content_width * 0.16, content_width * 0.22, content_width * 0.34])
    t_cabins.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_SAGE),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_SAGE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_cabins)

    # Page Break to ensure Section 3 and 4 are cleanly on Page 3
    story.append(PageBreak())

    # ==========================================
    # PÁGINA 3: ADMINISTRADOR & FUNCIONAMIENTO APP
    # ==========================================
    story.append(Paragraph("3. Tutorial de Administrador: Gestión y Control de Reservas", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceAfter=5, spaceBefore=1))

    story.append(Paragraph(
        "El módulo de administración permite al equipo del refugio supervisar las reservas entrantes, gestionar cobros pendientes, bloquear fechas por mantenimiento y comunicarse con los huéspedes:",
        body_style
    ))

    admin_steps = [
        ("Acceso al Panel",
         "Ingresar a <b>https://www.go.refugioaliwenspa.cl/admin</b> (o clic en el enlace <i>'administración →'</i> al pie de la página principal)."),

        ("Credenciales de Ingreso",
         "Correo oficial: <b>contacto@refugioaliwenspa.cl</b> junto con la contraseña maestra configurada en el sistema."),

        ("Calendario Maestro de Ocupación",
         "Visualización por cabaña de los días ocupados (en color verde oscuro con el nombre del huésped), evitando sobreventas."),

        ("Tabla General de Reservas",
         "Lista de todas las reservas con su código oficial (<b>#ALW-XXXXX</b>), nombre del huésped, teléfono, fechas de estadía, abono pagado y saldo pendiente al check-in."),

        ("Control y Modificación de Estados",
         "Selector directo de estado: <b>Confirmada</b>, <b>En proceso</b>, <b>Completada</b> o <b>Cancelada</b> (esta última libera las fechas automáticamente)."),

        ("Bloqueo Manual de Fechas (Mantenimiento)",
         "Permite bloquear temporalmente días para una cabaña específica ('Mantenimiento tinaja', 'Reparaciones' o 'Reserva telefónica') con opción de liberar con un clic."),

        ("Contacto Rápido vía WhatsApp",
         "Botón directo junto a cada reserva para abrir chat de WhatsApp con el huésped con un mensaje preconfigurado con sus fechas."),
    ]

    admin_rows = []
    for title, desc in admin_steps:
        admin_rows.append([
            Paragraph(f"<b>• {title}:</b>", table_cell_bold),
            Paragraph(desc, table_cell)
        ])

    t_admin = Table(admin_rows, colWidths=[140, content_width - 140])
    t_admin.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER_LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_admin)
    story.append(Spacer(1, 10))

    # SECCIÓN 4: CÓMO FUNCIONA LA APP
    story.append(Paragraph("4. Funcionamiento Integral de la Aplicación y Canales de Contacto", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY, spaceAfter=5, spaceBefore=1))

    flow_p = Paragraph(
        "<b>Circuito de Operación de Extremo a Extremo:</b><br/>"
        "1. <b>El Huésped ingresa</b> a <code>www.go.refugioaliwenspa.cl</code>, elige su cabaña y selecciona sus noches.<br/>"
        "2. <b>Flow procesa el abono</b> de forma segura en Webpay Plus y transfiere los fondos a la cuenta comercial del spa.<br/>"
        "3. <b>El sistema bloquea las fechas</b> inmediatamente tanto en la web como en el panel para evitar doble reserva.<br/>"
        "4. <b>El cliente descarga su voucher PDF</b> con el resumen de la estadía y el contacto directo de WhatsApp.<br/>"
        "5. <b>El equipo del spa recibe los datos</b>, prepara la tinaja a leña a la temperatura ideal y coordina el ingreso del huésped.<br/>"
        "6. <b>En el Check-in (15:00 hrs)</b>, se recibe al huésped y se liquida el saldo pendiente indicado en el voucher.",
        body_style
    )
    story.append(flow_p)
    story.append(Spacer(1, 8))

    contact_box_data = [
        [
            Paragraph(
                "<b>CANALES DE CONTACTO Y ATENCIÓN OFICIAL — REFUGIO ALIWEN SPA</b><br/>"
                "• <b>WhatsApp de Coordinación de Ingreso:</b> +56 9 9459 7751  (9 9459 7751)<br/>"
                "• <b>Correo Electrónico Oficial:</b> contacto@refugioaliwenspa.cl<br/>"
                "• <b>Sitio Web Informativo:</b> https://www.refugioaliwenspa.cl<br/>"
                "• <b>Plataforma de Agendamiento Online:</b> https://www.go.refugioaliwenspa.cl<br/>"
                "<i>Horarios de atención para recepción y coordinación: Lunes a Domingo de 09:00 a 20:00 hrs.</i>",
                callout_text
            )
        ]
    ]
    t_contact = Table(contact_box_data, colWidths=[content_width])
    t_contact.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_SAGE),
        ("BOX", (0, 0), (-1, -1), 1, COLOR_PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_contact)

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Manual successfully built at: {target_path}")

if __name__ == "__main__":
    print(f"Generating Desktop PDF: {OUTPUT_PDF_DESKTOP}")
    build_manual_pdf(OUTPUT_PDF_DESKTOP)
    print(f"Generating Local Backup PDF: {OUTPUT_PDF_LOCAL}")
    build_manual_pdf(OUTPUT_PDF_LOCAL)
