import "./menu-imersivo.css";

/* Ingresso da assinatura, na mesma linguagem das cenas do menu imersivo:
   três camadas em CSS 3D, tipografia grande e um código de barras feito
   de barras. Substitui o cartão de checkmarks, que parecia gerado. */

const BARRAS = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 2, 4, 1, 3, 1, 2, 2, 1, 4, 1, 1, 3, 1, 2, 1, 4, 2, 1, 3];

export default function PasseTicket() {
  return (
    <div className="dd-ticket-stage" aria-label="Ingresso da assinatura DriveData Academy">
      <div className="dd-ticket dd-ticket-back" aria-hidden="true" />
      <div className="dd-ticket dd-ticket-mid" aria-hidden="true"><span>12 MESES · OU MÊS A MÊS</span></div>
      <div className="dd-ticket dd-ticket-front">
        <div className="dd-ticket-top">
          <span>DRIVEDATA ACADEMY</span>
          <span>Nº 0001</span>
        </div>
        <strong>Você,<br />dentro.</strong>
        <p>Lives, gravações, comunidade, ferramentas e o cardápio de treinamentos com preço de assinante.</p>
        <div className="dd-ticket-cut" aria-hidden="true" />
        <div className="dd-ticket-foot">
          <div className="dd-ticket-barcode" aria-hidden="true">
            {BARRAS.map((w, i) => <b key={i} style={{ width: w }} />)}
          </div>
          <span>ADMITE UM · ACESSO LIBERADO APÓS O PAGAMENTO</span>
        </div>
        <i className="dd-ticket-stamp" aria-hidden="true">ATIVO</i>
      </div>
    </div>
  );
}
