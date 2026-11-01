
export async function init(data, root) {
    root.innerHTML = "";
  
    const style = document.createElement("style");
    style.textContent = `
      #p7 {
        --green: #17613c;
        --dark: #202622;
        --muted: #607067;
        font-family: Arial, Helvetica, sans-serif;
        background: #faf9f6;
        color: var(--dark);
        min-height: 100vh;
        padding: 35px 2% 80px;
        box-sizing: border-box;
        width: 100%;
        max-width: none;
        margin: 0;
        
      }
  
      #p7 * { box-sizing: border-box; }
  
      #p7 .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 4%;
        width: 100%;
        max-width: none;
        margin: 0;
        align-items: start;
      }
  
      #p7 h1 {
        font-size: clamp(48px, 5vw, 78px);
        font-weight: 400;
        line-height: 1.05;
        letter-spacing: -3px;
        margin: 0 0 22px;
      }
  
      #p7 .subtitle {
        color: var(--muted);
        font-size: 18px;
        margin-bottom: 25px;
      }
  
      #p7 .line {
        width: 65px;
        height: 5px;
        background: var(--green);
        border-radius: 5px;
        margin-bottom: 35px;
      }
  
      #p7 .dataset {
        background: #edf5ee;
        border-radius: 18px;
        padding: 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        margin-bottom: 30px;
      }
  
      #p7 .dataset h2 {
        font-size: 25px;
        margin: 0 0 10px;
      }
  
      #p7 .dataset p {
        font-size: 15px;
        margin: 5px 0;
      }
  
      #p7 .dataset a {
        text-decoration: none;
        color: var(--green);
        border: 1px solid var(--green);
        border-radius: 9px;
        padding: 12px 16px;
        background: white;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 600;
      }
  
      #p7 .dataset a:hover {
        background: var(--green);
        color: white;
      }
  
      #p7 .facts {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 35px;
      }
  
      #p7 .fact {
        border-right: 1px solid #d5ddd7;
        padding-right: 10px;
      }
  
      #p7 .fact:last-child {
        border-right: none;
      }
  
      #p7 .fact strong {
        display: block;
        font-size: 14px;
        margin-bottom: 8px;
      }
  
      #p7 .fact span {
        font-size: 13px;
        color: var(--muted);
        line-height: 1.5;
      }
  
      #p7 .info {
        margin-bottom: 25px;
      }
  
      #p7 .info h3 {
        font-size: 19px;
        margin: 0 0 9px;
      }
  
      #p7 .info p {
        font-size: 15px;
        line-height: 1.7;
        color: #414941;
        margin: 0;
      }
  
      #p7 details {
        border: 1px solid #dce9df;
        border-radius: 12px;
        padding: 15px 18px;
        margin-top: 12px;
        background: #fafdfa;
      }
  
      #p7 summary {
        cursor: pointer;
        font-weight: 600;
        color: var(--green);
      }
  
      #p7 details p {
        margin-top: 12px;
      }
  
      #p7 .members {
        border: 1px solid #d4e5d8;
        border-radius: 20px;
        padding: 30px;
        background: white;
      }
  
      #p7 .members h2 {
        font-size: 28px;
        margin: 0 0 8px;
      }
  
      #p7 .course {
        font-size: 17px;
        color: var(--muted);
        margin-bottom: 25px;
      }
  
      #p7 .member {
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr);
        gap: 10px;
        padding: 16px 0;
        border-bottom: 1px solid #e3eae4;
        align-items: start;
      }
  
      #p7 .member:last-child {
        border-bottom: none;
      }
  
      #p7 .student-id {
        font-weight: 700;
        font-size: 13px;
      }
  
      #p7 .member-name {
        font-size: 14px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
  
      #p7 .role {
        display: inline-block;
        background: #e3f0e5;
        color: #17613c;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        margin-top: 7px;
      }
  
      #p7 .references a {
        color: var(--green);
        overflow-wrap: anywhere;
      }
  
      #p7 .footer {
        max-width: 1450px;
        margin: 55px auto 0;
        padding-top: 20px;
        border-top: 1px solid #dce9df;
        color: var(--muted);
        font-size: 13px;
        text-align: center;
      }
  
      @media (max-width: 950px) {
        #p7 .layout {
          grid-template-columns: 1fr;
          gap: 40px;
        }
      }
  
      @media (max-width: 600px) {
        #p7 { padding: 30px 5% 65px; }
        #p7 h1 {
          font-size: 48px;
          letter-spacing: -2px;
        }
        #p7 .dataset {
          flex-direction: column;
          align-items: flex-start;
        }
        #p7 .facts {
          grid-template-columns: 1fr;
        }
        #p7 .fact {
          border-right: none;
          border-bottom: 1px solid #d5ddd7;
          padding-bottom: 12px;
        }
        #p7 .members { padding: 20px; }
        #p7 .member {
          grid-template-columns: 1fr;
          gap: 4px;
        }
      }
    `;
  
    root.appendChild(style);
  
    const members = [
      ["6622771481", "Wichaya Tangtanasub", "Dashboard Page 6"],
      ["6622780805", "Rachata Theerapraphotphanu", "Dashboard Page 2"],
      ["6622780946", "Varittha Rueangdech", "Dashboard Page 3"],
      ["6622781035", "Mathanapan Sangwongkaro", "Dashboard Page 5"],
      ["6622781043", "Nutnicha Masomboon", "Dashboard Pages 1, 7"],
      ["6622781332", "Pimlada Puwanatnarueban", "Dashboard Page 3"],
      ["6622781373", "Paphawin Grobjinda", "Dashboard Page 4"],
      ["6622781506", "Ploybhailyn Punyadirek", "Dashboard Page 5"],
      ["6622782348", "Supawit Omsin", "Dashboard Page 2"]
    ];
  
    const page = document.createElement("section");
    page.id = "p7";
  
    page.innerHTML = `
      <div class="layout">
  
        <div class="left">
          <h1>Data Source<br>and About Us</h1>
  
          <div class="subtitle">
            The data, methods, and people behind this project
          </div>
  
          <div class="line"></div>
  
          <div class="dataset">
            <div>
              <h2>Dataset</h2>
              <p><strong>FAOSTAT — Crops and livestock products</strong></p>
              <p>Food and Agriculture Organization of the United Nations (FAO)</p>
            </div>
  
            <a
              href="https://www.fao.org/faostat/en/#data/QCL"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Dataset ↗
            </a>
          </div>
  
          <div class="facts">
            <div class="fact">
              <strong>Dataset name (QCL)</strong>
              <span>Crops and livestock products</span>
            </div>
  
            <div class="fact">
              <strong>Data source</strong>
              <span>FAOSTAT / FAO</span>
            </div>
  
            <div class="fact">
              <strong>Local data format</strong>
              <span>JSON</span>
            </div>
          </div>
  
          <div class="info">
            <h3>Data Processing</h3>
            <p>
              The FAOSTAT dataset was prepared for interactive visualization,
              including agricultural production, harvested area, and yield.
            </p>
  
            <details>
              <summary>View data processing notes</summary>
              <p>
                For the global cereal charts, the data is filtered to
                World and Cereals, primary for 1961–2024.
                Harvested area is converted into million hectares,
                yield into tonnes per hectare, and production is
                indexed to 1961 = 100.
              </p>
            </details>
          </div>
  
          <div class="info">
            <h3>Limitations</h3>
            <p>
              Some countries and years may contain missing values.
              Data availability and coverage may vary across
              agricultural products, regions, and time periods.
            </p>
          </div>
  
          <div class="info references">
            <h3>References</h3>
            <p>
              Food and Agriculture Organization of the United Nations.
              FAOSTAT: Crops and livestock products.
            </p>
            <p>
              <a href="https://www.fao.org/faostat/en/#data/QCL"
                 target="_blank" rel="noopener noreferrer">
                https://www.fao.org/faostat/en/#data/QCL
              </a>
            </p>
          </div>
        </div>
  
        <div class="members">
          <h2>Group: What’s??</h2>
          <div class="course">DSS433 – Data Visualization</div>
  
          ${members.map(member => `
            <div class="member">
              <div class="student-id">${member[0]}</div>
              <div>
                <div class="member-name">${member[1]}</div>
                <span class="role">${member[2]}</span>
              </div>
            </div>
          `).join("")}
        </div>
  
      </div>
  
      <div class="footer">
        DSS433 – Data Visualization · Group: What’s??
        · FAOSTAT Agricultural Data Visualization Project
      </div>
    `;
  
    root.appendChild(page);
  }
  