import React, {useState} from 'react';
import { useAuth } from '@/context/auth';
import { useNavigate, Link } from 'react-router-dom';

export default function SignupPage() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState('');

  return (
    <div className="min-h-screen grid place-items-center bg-[#0E1116]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Create your SportSight account</h1>
        {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
        <input className="border rounded p-2 w-full mb-3" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded p-2 w-full mb-4" placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
        <button className="w-full border rounded p-2" onClick={async()=>{
          try { await signup(email, pw); nav('/select-sport'); }
          catch(e:any){ setErr(e.message||'Sign up failed'); }
        }}>Create account</button>
        <div className="text-xs text-gray-500 mt-3">Already have an account? <Link to="/login" className="underline">Log in</Link></div>
      </div>
    </div>
  );
}
