import { jsPDF } from "jspdf"
import {
  type CalculationResult,
  type CalculatorInput,
  FINISHING_LABELS,
  URGENCY_LABELS,
  formatBRL,
  formatTime,
} from "@/lib/calc"

// Cores (RGB) alinhadas ao tema da aplicação
const COLOR_PRIMARY: [number, number, number] = [217, 119, 66]
const COLOR_TEXT: [number, number, number] = [38, 38, 40]
const COLOR_MUTED: [number, number, number] = [120, 120, 125]
const COLOR_LINE: [number, number, number] = [225, 222, 218]

export function generateQuotePDF(input: CalculatorInput, result: CalculationResult) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 18
  const contentW = pageWidth - marginX * 2
  let y = 22

  const now = new Date()
  const dateStr = now.toLocaleDateString("pt-BR")
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  // Cabeçalho
  doc.setTextColor(...COLOR_PRIMARY)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("Orçamento", marginX, y)

  doc.setTextColor(...COLOR_MUTED)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Impressão 3D (FDM)", marginX, y + 6)

  doc.setFontSize(9)
  doc.text(`Emitido em ${dateStr} às ${timeStr}`, pageWidth - marginX, y, { align: "right" })

  y += 14
  doc.setDrawColor(...COLOR_LINE)
  doc.setLineWidth(0.4)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 10

  // Seção: Detalhes da peça
  const section = (title: string) => {
    doc.setTextColor(...COLOR_TEXT)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(title, marginX, y)
    y += 7
  }

  const row = (label: string, value: string, opts?: { bold?: boolean }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal")
    doc.setFontSize(10)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(label, marginX, y)
    doc.setTextColor(...COLOR_TEXT)
    doc.text(value, pageWidth - marginX, y, { align: "right" })
    y += 6
    doc.setDrawColor(...COLOR_LINE)
    doc.setLineWidth(0.2)
    doc.line(marginX, y - 2, pageWidth - marginX, y - 2)
  }

  section("Detalhes da peça")
  row("Material", input.material)
  row("Peso total", `${result.weightTotal.toLocaleString("pt-BR")} g`)
  row("Tempo total", formatTime(result.timeTotalMinutes))
  row("Quantidade", `${input.quantity} peça(s)`)
  row("Acabamento", FINISHING_LABELS[input.finishing])
  if (!input.filamentOnly) {
    row("Urgência", URGENCY_LABELS[input.urgency])
  }
  y += 10

  // Destaque: Valor total
  const boxH = 20
  doc.setFillColor(...COLOR_PRIMARY)
  doc.roundedRect(marginX, y, contentW, boxH, 3, 3, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Valor total", marginX + 6, y + boxH / 2 + 1)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(formatBRL(result.final), pageWidth - marginX - 6, y + boxH / 2 + 1.5, { align: "right" })
  y += boxH + 6

  if (input.quantity > 1) {
    doc.setTextColor(...COLOR_MUTED)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.text(`Valor por peça: ${formatBRL(result.finalPerPiece)}`, pageWidth - marginX, y, {
      align: "right",
    })
    y += 6
  }

  // Rodapé
  const footerY = doc.internal.pageSize.getHeight() - 14
  doc.setDrawColor(...COLOR_LINE)
  doc.setLineWidth(0.3)
  doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5)
  doc.setTextColor(...COLOR_MUTED)
  doc.setFontSize(8)
  doc.text("Gerado pela Calculadora de Precificação 3D", marginX, footerY)
  doc.text("Valores sujeitos a alteração.", pageWidth - marginX, footerY, { align: "right" })

  const fileName = `orcamento-3d-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}.pdf`
  doc.save(fileName)
}
