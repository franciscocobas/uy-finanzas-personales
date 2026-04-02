import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";

interface PagosPendientesEmailProps {
  mes: string;
  pendientes: string[];
  pagados: string[];
}

export default function RecordatorioPagosEmail({
  mes,
  pendientes,
  pagados,
}: PagosPendientesEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Pagos pendientes de {mes}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Pagos de {mes}</Heading>

          {pendientes.length > 0 && (
            <Section style={section}>
              <Text style={sectionTitle}>Pendientes</Text>
              {pendientes.map((nombre) => (
                <Row key={nombre} style={row}>
                  <Column style={iconColumn}>⬜</Column>
                  <Column>
                    <Text style={itemText}>{nombre}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {pagados.length > 0 && (
            <Section style={{ ...section, marginTop: 24 }}>
              <Text style={{ ...sectionTitle, color: "#888" }}>Ya pagados</Text>
              {pagados.map((nombre) => (
                <Row key={nombre} style={row}>
                  <Column style={iconColumn}>✅</Column>
                  <Column>
                    <Text style={{ ...itemText, color: "#888" }}>{nombre}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Text style={footer}>
            {pendientes.length === 0
              ? "Todo al día este mes."
              : `${pendientes.length} pago${pendientes.length > 1 ? "s" : ""} pendiente${pendientes.length > 1 ? "s" : ""}.`}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container: React.CSSProperties = {
  margin: "40px auto",
  backgroundColor: "#ffffff",
  borderRadius: 8,
  padding: "32px 40px",
  maxWidth: 480,
};

const heading: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: "#18181b",
  marginBottom: 24,
};

const section: React.CSSProperties = {
  borderRadius: 6,
  backgroundColor: "#f9f9f9",
  padding: "12px 16px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#52525b",
  margin: "0 0 8px",
};

const row: React.CSSProperties = {
  marginBottom: 4,
};

const iconColumn: React.CSSProperties = {
  width: 28,
  fontSize: 14,
};

const itemText: React.CSSProperties = {
  fontSize: 14,
  color: "#18181b",
  margin: 0,
};

const footer: React.CSSProperties = {
  fontSize: 13,
  color: "#71717a",
  marginTop: 28,
  textAlign: "center",
};
