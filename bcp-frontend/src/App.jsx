import React, { useEffect, useMemo, useState } from "react";

/**
 * BCP Quick Capture – React‑only single‑file app
 * - No backend. Everything is stored in localStorage as "bcp_draft".
 * - Tailwind CSS is expected (add it in your project).
 * - Features: multi‑step wizard, add/remove dynamic lists, validation for required fields,
 *   Skip Step (where optional), Save Draft, Load Draft, printable Response Card.
 */

const STEPS = ["Service & Processes", "Business Impact", "Communication", "Risks & Finish"]; // 4 steps

const EMPTY = {
  name: "",
  business_unit: "",
  sub_business_unit: "",
  service_name: "",
  service_description: "",
  processes: [], // [{name:'', sites:[{name:'', headcount:0}]}]
  owners: [], // [{role:'primary'|'backup', name:'', email:''}]
  criticality_unit: "days",
  criticality_value: 1,
  dependencies: [], // [{type:'Upstream'|'IT'|'Equipment'|'External', label:''}]
  notifications: [], // [{name:'', email:''}]
  risk_notes: ""
};

export default function App() {
  const [i, setI] = useState(0);
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bcp_draft");
      if (raw) {
        setData({ ...EMPTY, ...JSON.parse(raw) });
        setLoaded(true);
      }
    } catch {}
  }, []);

  const canNext = useMemo(() => validateStep(i, data).ok, [i, data]);

  function saveDraft() {
    localStorage.setItem("bcp_draft", JSON.stringify(data));
    toast("Draft saved locally ✨");
  }
  function clearDraft() {
    localStorage.removeItem("bcp_draft");
    setData(EMPTY);
    setI(0);
    toast("Draft cleared");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Wizard */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Step {i + 1} of {STEPS.length}</p>
              <h2 className="text-xl font-semibold">{STEPS[i]}</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={saveDraft}>Save Draft</Button>
              <Button variant="ghost" onClick={() => window.print()}>Generate Response Card</Button>
            </div>
          </div>

          {i === 0 && <StepService data={data} setData={setData} />}
          {i === 1 && <StepBIA data={data} setData={setData} />}
          {i === 2 && <StepComms data={data} setData={setData} />}
          {i === 3 && <StepRisk data={data} setData={setData} />}

          <div className="mt-6 flex items-center gap-3">
            <Button disabled={i === 0} onClick={() => setI(i - 1)}>Back</Button>
            {i < STEPS.length - 1 && (
              <Button intent="primary" disabled={!canNext} onClick={() => setI(i + 1)}>
                Next
              </Button>
            )}
            {i === STEPS.length - 1 && (
              <Button intent="primary" onClick={saveDraft}>Finish & Save</Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={() => setData(EMPTY)}>Reset Form</Button>
              <Button variant="ghost" onClick={clearDraft}>Clear Draft</Button>
            </div>
          </div>

          {/* Inline validation */}
          {!validateStep(i, data).ok && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {validateStep(i, data).msg}
            </p>
          )}
        </Card>

        {/* Right: Summary */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Your Plan So Far</h2>
          <Summary data={data} loaded={loaded} />
          <div className="mt-4 text-right print:hidden">
            <Button onClick={() => window.print()} intent="primary">Generate Response Card</Button>
          </div>
        </Card>
      </div>
      <Toasts />
    </div>
  );
}

/*************************
 * Step 1 – Service & Processes
 *************************/
function StepService({ data, setData }) {
  const u = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const addProc = () => setData(d => ({ ...d, processes: [...d.processes, { name: "", sites: [] }] }));
  const delProc = (idx) => setData(d => ({ ...d, processes: d.processes.filter((_, i) => i !== idx) }));

  const addSite = (pi) => setData(d => {
    const p = [...d.processes];
    p[pi] = { ...p[pi], sites: [...p[pi].sites, { name: "", headcount: 0 }] };
    return { ...d, processes: p };
  });

  return (
    <div>
      <Field label="Name of BCP" required>
        <input className="Input" value={data.name} onChange={(e) => u("name", e.target.value)} placeholder="e.g. Payroll BCP" />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Business Unit"><input className="Input" value={data.business_unit} onChange={e => u("business_unit", e.target.value)} /></Field>
        <Field label="Sub Business Unit"><input className="Input" value={data.sub_business_unit} onChange={e => u("sub_business_unit", e.target.value)} /></Field>
      </div>
      <Field label="Service name" required>
        <input className="Input" value={data.service_name} onChange={(e) => u("service_name", e.target.value)} placeholder="e.g. Payroll System" />
      </Field>
      <Field label="Description">
        <textarea className="Input min-h-[90px]" value={data.service_description} onChange={(e) => u("service_description", e.target.value)} />
      </Field>

      <div className="mt-5">
        <Label>What are the main processes this service depends on?</Label>
        {data.processes.map((p, pi) => (
          <div className="Group" key={pi}>
            <div className="flex gap-3 items-start">
              <input className="Input flex-1" placeholder="Process name" value={p.name} onChange={(e) => {
                const arr = [...data.processes];
                arr[pi] = { ...arr[pi], name: e.target.value };
                setData({ ...data, processes: arr });
              }} />
              <Button variant="danger" onClick={() => delProc(pi)}>Remove</Button>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Sites</span>
                <Button variant="soft" onClick={() => addSite(pi)}>+ Add site</Button>
              </div>
              {p.sites.map((s, si) => (
                <div className="grid grid-cols-3 gap-2 mb-2" key={si}>
                  <input className="Input col-span-2" placeholder="Site name" value={s.name} onChange={(e) => {
                    const arr = [...data.processes];
                    const sites = [...arr[pi].sites];
                    sites[si] = { ...sites[si], name: e.target.value };
                    arr[pi] = { ...arr[pi], sites };
                    setData({ ...data, processes: arr });
                  }} />
                  <input type="number" className="Input" placeholder="Headcount" value={s.headcount}
                    onChange={(e) => {
                      const val = Number(e.target.value || 0);
                      const arr = [...data.processes];
                      const sites = [...arr[pi].sites];
                      sites[si] = { ...sites[si], headcount: val };
                      arr[pi] = { ...arr[pi], sites };
                      setData({ ...data, processes: arr });
                    }} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="soft" onClick={addProc}>+ Add process</Button>
      </div>

      <div className="mt-6">
        <Label>Process Owners (from roster)</Label>
        <OwnerList data={data} setData={setData} />
      </div>
    </div>
  );
}

function OwnerList({ data, setData }) {
  const add = () => setData(d => ({ ...d, owners: [...d.owners, { role: "primary", name: "", email: "" }] }));
  const del = (i) => setData(d => ({ ...d, owners: d.owners.filter((_, x) => x !== i) }));
  return (
    <div>
      {data.owners.map((o, oi) => (
        <div key={oi} className="grid grid-cols-4 gap-2 mb-2">
          <select className="Input" value={o.role} onChange={(e) => {
            const arr = [...data.owners];
            arr[oi] = { ...arr[oi], role: e.target.value };
            setData({ ...data, owners: arr });
          }}>
            <option value="primary">Primary</option>
            <option value="backup">Backup</option>
          </select>
          <input className="Input" placeholder="Name" value={o.name} onChange={(e) => {
            const arr = [...data.owners];
            arr[oi] = { ...arr[oi], name: e.target.value };
            setData({ ...data, owners: arr });
          }} />
          <input className="Input col-span-2" placeholder="Email" value={o.email} onChange={(e) => {
            const arr = [...data.owners];
            arr[oi] = { ...arr[oi], email: e.target.value };
            setData({ ...data, owners: arr });
          }} />
          <Button variant="danger" onClick={() => del(oi)}>Remove</Button>
        </div>
      ))}
      <Button variant="soft" onClick={add}>+ Add owner</Button>
    </div>
  );
}

/*************************
 * Step 2 – BIA
 *************************/
function StepBIA({ data, setData }) {
  const u = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const addDep = () => setData(d => ({ ...d, dependencies: [...d.dependencies, { type: "Upstream", label: "" }] }));
  const delDep = (i) => setData(d => ({ ...d, dependencies: d.dependencies.filter((_, x) => x !== i) }));
  return (
    <div>
      <Field label="Criticality (MTD) – when must the process be restored?" required>
        <div className="grid grid-cols-3 gap-2">
          <select className="Input" value={data.criticality_unit} onChange={e => u("criticality_unit", e.target.value)}>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
          <input type="number" min={0} className="Input col-span-2" value={data.criticality_value} onChange={e => u("criticality_value", Number(e.target.value || 0))} />
        </div>
      </Field>

      <div className="mt-4">
        <Label>Dependencies</Label>
        {data.dependencies.map((dep, di) => (
          <div key={di} className="grid grid-cols-4 gap-2 mb-2">
            <select className="Input" value={dep.type} onChange={e => {
              const a = [...data.dependencies]; a[di] = { ...a[di], type: e.target.value }; setData({ ...data, dependencies: a });
            }}>
              <option>Upstream</option>
              <option>IT</option>
              <option>Equipment</option>
              <option>External</option>
            </select>
            <input className="Input col-span-2" placeholder="Label" value={dep.label} onChange={e => {
              const a = [...data.dependencies]; a[di] = { ...a[di], label: e.target.value }; setData({ ...data, dependencies: a });
            }} />
            <Button variant="danger" onClick={() => delDep(di)}>Remove</Button>
          </div>
        ))}
        <Button variant="soft" onClick={addDep}>+ Add dependency</Button>
      </div>

      <div className="mt-4">
        <Button variant="soft" onClick={() => toast("Step can be skipped in this prototype.")}>Skip Step</Button>
      </div>
    </div>
  );
}

/*************************
 * Step 3 – Communication
 *************************/
function StepComms({ data, setData }) {
  const add = () => setData(d => ({ ...d, notifications: [...d.notifications, { name: "", email: "" }] }));
  const del = (i) => setData(d => ({ ...d, notifications: d.notifications.filter((_, x) => x !== i) }));
  return (
    <div>
      <Field label="Who should be notified if the service is disrupted?">
        {data.notifications.map((n, ni) => (
          <div key={ni} className="grid grid-cols-4 gap-2 mb-2">
            <input className="Input" placeholder="Name / Group" value={n.name} onChange={(e) => {
              const a = [...data.notifications]; a[ni] = { ...a[ni], name: e.target.value }; setData({ ...data, notifications: a });
            }} />
            <input className="Input col-span-2" placeholder="Email" value={n.email} onChange={(e) => {
              const a = [...data.notifications]; a[ni] = { ...a[ni], email: e.target.value }; setData({ ...data, notifications: a });
            }} />
            <Button variant="danger" onClick={() => del(ni)}>Remove</Button>
          </div>
        ))}
        <Button variant="soft" onClick={add}>+ Add recipient</Button>
      </Field>
    </div>
  );
}

/*************************
 * Step 4 – Risks & Finish
 *************************/
function StepRisk({ data, setData }) {
  return (
    <div>
      <Field label="Any major risks to note? (optional)">
        <textarea className="Input min-h-[100px]" value={data.risk_notes} onChange={(e) => setData({ ...data, risk_notes: e.target.value })} placeholder="e.g., power outage, cyber incident, supply issue" />
      </Field>
      <Button variant="soft" onClick={() => toast("Step skipped")}>Skip Step</Button>
    </div>
  );
}

/*************************
 * Summary Card
 *************************/
function Summary({ data, loaded }) {
  const sites = useMemo(() => {
    const s = new Set();
    data.processes.forEach(p => p.sites?.forEach(x => x.name && s.add(x.name)));
    return Array.from(s);
  }, [data.processes]);

  return (
    <div>
      <Row k="Service" v={data.service_name || "—"} />
      <Row k="Processes" v={data.processes.map(p => p.name).filter(Boolean).join(", ") || "—"} />
      <Row k="Sites" v={sites.join(", ") || "—"} />
      <Row k="Owners" v={data.owners.map(o => `${o.role}: ${o.name}`).filter(Boolean).join(" | ") || "—"} />
      <Row k="Criticality" v={`${data.criticality_value || "—"} ${data.criticality_unit}`} />
      <Row k="Dependencies" v={data.dependencies.map(d => `${d.type}: ${d.label}`).filter(Boolean).join(" | ") || "—"} />
      <Row k="Risks" v={data.risk_notes || "—"} />
      <Row k="Notifications" v={data.notifications.map(n => `${n.name} <${n.email}>`).filter(Boolean).join(" | ") || "—"} />
      <div className="mt-4 text-sm text-gray-500">
        {loaded ? "Loaded saved draft from your browser." : "Draft not loaded yet."}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <dt className="w-32 text-gray-500">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}

/*************************
 * UI Primitives
 *************************/
function Header() {
  return (
    <div className="bg-white border-b sticky top-0 z-10 print:hidden">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Business Continuity Quick Capture</h1>
        <span className="text-sm text-gray-500">React‑only prototype</span>
      </div>
    </div>
  );
}

function Card({ children }) {
  return <div className="bg-white rounded-2xl shadow p-5">{children}</div>;
}

function Label({ children }) {
  return <label className="block text-sm font-medium mb-2">{children}</label>;
}

function Field({ label, required, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Button({ children, intent = "default", variant = "solid", ...props }) {
  const base = "px-3 py-2 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    default: "bg-gray-200 hover:bg-gray-300",
    primary: "bg-gray-900 text-white hover:bg-black",
  };
  const variants = {
    solid: "",
    ghost: "bg-transparent hover:bg-gray-100",
    soft: "bg-gray-100 hover:bg-gray-200",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
  };
  const cls = `${base} ${styles[intent] || styles.default} ${variants[variant] || ""}`;
  return <button className={cls} {...props}>{children}</button>;
}

function validateStep(stepIndex, d) {
  // simple synchronous validation
  if (stepIndex === 0) {
    if (!d.name?.trim()) return { ok: false, msg: "Please provide the BCP name." };
    if (!d.service_name?.trim()) return { ok: false, msg: "Please provide the Service name." };
  }
  if (stepIndex === 1) {
    if (!d.criticality_value || d.criticality_value < 0) return { ok: false, msg: "Provide a non‑negative criticality value." };
  }
  return { ok: true, msg: "" };
}

/*************************
 * Tiny Toast system (no deps)
 *************************/
/*************************
 * Tiny Toast system (no deps)
 *************************/
const listeners = new Set();
function toast(msg) { listeners.forEach((fn) => fn(msg)); }

function Toasts() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const fn = (m) => {
      setMsg(m);
      setTimeout(() => setMsg(""), 2000);
    };
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg print:hidden">
      {msg}
    </div>
  );
}


/* Tailwind helpers via className */
const inputBase = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400";
function Input(props) { return <input className={inputBase} {...props} />; }
// But we used direct className "Input" string for brevity – add this to your global CSS:
// .Input{ @apply w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400; }
