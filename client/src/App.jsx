import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, User, Clock, CheckCircle, 
  Package, BookOpen, Plus, Minus, X, Upload, Trash2, Eye, 
  ChevronLeft, ChevronRight, Send, Loader2
} from 'lucide-react';

// --- ASSETS ---
import fotoIA from './assets/ia.png'; 
import logo from './assets/logo.png';
import bannerPascoa from './assets/banner_pascoa.png';
import bannerItens from './assets/banner_itens.png';
import banneria from './assets/banneria.png'

const API_URL = 'http://localhost:3001/api';

function App() {
  const isAdmin = window.location.search.includes('admin');
  
  // --- ESTADOS GERAIS ---
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [abaAdm, setAbaAdm] = useState('pedidos');
  const [mensagem, setMensagem] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // [NOVO] Global Loading
  
  // --- ESTADOS LOJA ---
  const [carrinho, setCarrinho] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [dadosCadastro, setDadosCadastro] = useState({ nome: '', zap: '' }); // [NOVO] Cadastro Simples
  const [pedidoSucesso, setPedidoSucesso] = useState(null); // [NOVO] Protocolo final
  
  const [bannerAtual, setBannerAtual] = useState(0);
  const banners = [bannerPascoa, bannerItens, banneria];

  // --- ESTADOS ADM ---
  const [showModalNovo, setShowModalNovo] = useState(false);
  const [novoLivro, setNovoLivro] = useState({ nome: '', preco: '', foto: null });
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null); 

  // --- ESTADOS IA DE RASTREIO ---
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'bot', text: 'Paz do Senhor! Sou o IA Julião 🤖. Digite seu NOME ou o NÚMERO DO PEDIDO para eu rastrear!' }
  ]);

  // --- EFEITOS ---
  useEffect(() => {
    carregarProdutos();
    if (isAdmin) carregarPedidos();
    else {
      const timer = setInterval(() => {
        setBannerAtual((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isAdmin]);

  const carregarProdutos = async () => {
    try {
      const res = await axios.get(`${API_URL}/produtos`);
      setProdutos(res.data);
    } catch (err) { console.error(err); }
  };

  const carregarPedidos = async () => {
    try {
      const res = await axios.get(`${API_URL}/pedidos`);
      setPedidos(res.data);
    } catch (err) { console.error(err); }
  };

  // --- FUNÇÕES DA LOJA (COM QUANTIDADE) ---
  const adicionarAoCarrinho = (p) => {
    setCarrinho(prev => {
      const existe = prev.find(item => item.id === p.id);
      if (existe) {
        return prev.map(item => item.id === p.id ? { ...item, quantidade: item.quantidade + 1 } : item);
      }
      return [...prev, { ...p, quantidade: 1 }];
    });
    setMensagem({ tipo: 'sucesso', texto: `${p.nome} adicionado!` });
    setTimeout(() => setMensagem(null), 2000);
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === id) {
        const novaQtd = Math.max(1, item.quantidade + delta);
        return { ...item, quantidade: novaQtd };
      }
      return item;
    }));
  };

  const finalizarCompra = async () => {
    if (!dadosCadastro.nome || !dadosCadastro.zap || carrinho.length === 0) {
        return alert("Preencha seu nome e whatsapp para a entrega!");
    }
    
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/pedidos`, {
        cliente: dadosCadastro.nome,
        telefone: dadosCadastro.zap,
        produtos: carrinho.map(p => ({ nome: p.nome, quantidade: p.quantidade }))
      });
      
      setPedidoSucesso(res.data.id);
      setCarrinho([]);
      setDadosCadastro({ nome: '', zap: '' });
      setMensagem({ tipo: 'sucesso', texto: 'Pedido enviado com sucesso!' });
    } catch (err) { 
      alert("Erro ao salvar pedido no banco."); 
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNÇÕES DA IA (BUSCA POR NOME OU ID) ---
  const falarComIA = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const res = await axios.get(`${API_URL}/rastreio/${userMsg}`);
      const dados = res.data;

      if (dados.length === 0) {
        setChatLog(prev => [...prev, { role: 'bot', text: `Irmão(ã), não encontrei nenhum pedido com "${userMsg}". Confirma o número ou seu nome!` }]);
      } else {
        const p = dados[0]; 
        let resposta = `Achei seu pedido #${p.id}! 🎉\n\nItens: ${p.itens}\nStatus: ${p.status.toUpperCase()}\n\n`;
        resposta += p.status === 'pendente' ? "Estamos preparando tudo! 📚" : p.status === 'processando' ? "Está na embalagem! 📦" : "Já foi entregue! 🙌";
        setChatLog(prev => [...prev, { role: 'bot', text: resposta }]);
      }
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'bot', text: "O Joãozinho tropeçou nos cabos, tenta daqui a pouco! 🔌" }]);
    }
  };

  // ... (Funções do ADM: atualizarStatus, excluir, cadastrar, salvarPreco permanecem iguais à versão anterior) ...
  const atualizarStatusPedido = async (id, novoStatus) => {
    try {
      await axios.put(`${API_URL}/pedidos/${id}/status`, { novoStatus });
      carregarPedidos();
      setMensagem({ tipo: 'sucesso', texto: 'Status Atualizado!' });
      setTimeout(() => setMensagem(null), 2000);
    } catch (err) { alert("Erro ao atualizar"); }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Apagar esse livro?")) return;
    try {
      await axios.delete(`${API_URL}/produtos/${id}`);
      carregarProdutos();
    } catch (err) { alert("Erro ao excluir."); }
  };

  const cadastrarLivro = async () => {
    if (!novoLivro.nome || !novoLivro.preco || !novoLivro.foto) return alert("Preencha tudo!");
    const data = new FormData();
    data.append('nome', novoLivro.nome);
    data.append('preco', novoLivro.preco);
    data.append('foto', novoLivro.foto);
    try {
      await axios.post(`${API_URL}/produtos`, data);
      setShowModalNovo(false);
      carregarProdutos();
    } catch (err) { console.error(err); }
  };

  const salvarPreco = async (id, preco) => {
    const p = parseFloat(preco);
    if (isNaN(p) || p <= 0) return alert("Preço inválido");
    try {
      await axios.put(`${API_URL}/produtos/${id}`, { preco: p });
      setMensagem({ tipo: 'sucesso', texto: 'Preço atualizado!' });
      carregarProdutos();
      setTimeout(() => setMensagem(null), 2000);
    } catch (err) { alert('Erro ao salvar.'); }
  };

  // --- RENDER ADMIN ---
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-900">
        <div className="max-w-7xl mx-auto">
          <header className="bg-white p-8 rounded-[2.5rem] shadow-sm border mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-2 italic tracking-tighter">
                <Package className="text-purple-600" size={32} /> PAINEL GESTÃO
              </h1>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setAbaAdm('pedidos')} className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${abaAdm === 'pedidos' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>Pedidos</button>
                <button onClick={() => setAbaAdm('estoque')} className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${abaAdm === 'estoque' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>Estoque</button>
              </div>
            </div>
            <a href="/" className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition">Sair</a>
          </header>

          {abaAdm === 'pedidos' ? (
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <tr><th className="p-6">ID</th><th className="p-6">Cliente</th><th className="p-6">Status</th><th className="p-6 text-center">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setPedidoSelecionado(p)}>
                      <td className="p-6 font-mono text-purple-600 font-bold">#{p.id}</td>
                      <td className="p-6 font-bold text-slate-700">{p.cliente}</td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'finalizado' ? 'bg-green-100 text-green-700' : p.status === 'processando' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-6 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {p.status !== 'finalizado' && (
                          <>
                            <button onClick={() => atualizarStatusPedido(p.id, 'processando')} className="p-3 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100"><Clock size={18}/></button>
                            <button onClick={() => atualizarStatusPedido(p.id, 'finalizado')} className="p-3 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100"><CheckCircle size={18}/></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button onClick={() => setShowModalNovo(true)} className="p-8 bg-white border-2 border-dashed border-purple-200 rounded-[2rem] text-purple-600 font-black flex flex-col items-center gap-2"><Plus size={32}/> NOVO LIVRO</button>
              {produtos.map(prod => (
                <div key={prod.id} className="bg-white p-5 rounded-[2rem] border flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={prod.imagem_url} className="w-14 h-14 rounded-xl object-cover border" alt={prod.nome} />
                    <h3 className="font-bold text-slate-700 text-sm">{prod.nome}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue={prod.preco} onBlur={(e) => salvarPreco(prod.id, e.target.value)} className="w-16 bg-slate-50 p-1 rounded font-black text-green-600 text-xs text-center border outline-none" />
                    <button onClick={() => excluirProduto(prod.id)} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Detalhes e Novo Produto omitidos para brevidade, mas devem ser mantidos conforme sua versão original */}
        {showModalNovo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black uppercase italic mb-8">Novo Livro</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nome do Livro" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setNovoLivro({...novoLivro, nome: e.target.value})} />
                <input type="number" placeholder="Preço (R$)" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setNovoLivro({...novoLivro, preco: e.target.value})} />
                <input type="file" className="w-full p-5 bg-slate-50 border rounded-2xl" onChange={(e) => setNovoLivro({...novoLivro, foto: e.target.files[0]})} />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowModalNovo(false)} className="flex-1 font-bold text-slate-400">Cancelar</button>
                <button onClick={cadastrarLivro} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black">SALVAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER LOJA ---
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative overflow-x-hidden">
      
      <header className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-50 py-5 px-8 flex justify-between items-center shadow-sm w-full">
        <img src={logo} className="h-10 w-auto" alt="Logo" />
        <button onClick={() => setShowCheckout(true)} className="relative p-3 bg-slate-50 rounded-full">
          <ShoppingCart size={28} className="text-purple-700" />
          {carrinho.length > 0 && <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-bounce">{carrinho.reduce((a, b) => a + b.quantidade, 0)}</span>}
        </button>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 py-10">
        {/* CARROSSEL */}
        <div className="relative w-full aspect-[16/9] rounded-[3rem] overflow-hidden mb-16 shadow-2xl group border-4 border-white">
          <img src={banners[bannerAtual]} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" alt="Banner" />
          <button onClick={() => setBannerAtual(bannerAtual === 0 ? banners.length - 1 : bannerAtual - 1)} className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/90 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all"><ChevronLeft size={28} /></button>
          <button onClick={() => setBannerAtual(bannerAtual === banners.length - 1 ? 0 : bannerAtual + 1)} className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/90 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all"><ChevronRight size={28} /></button>
        </div>

        <h2 className="text-3xl font-black mb-12 italic border-l-8 border-purple-600 pl-6 uppercase tracking-tighter">Veja nossas Recomendações</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {produtos.map(livro => (
            <div key={livro.id} className="flex flex-col group">
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 bg-slate-50 shadow-sm group-hover:shadow-2xl transition-all">
                <img src={livro.imagem_url} className="w-full h-full object-cover group-hover:scale-110 duration-700" alt={livro.nome} />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-purple-600 transition">{livro.nome}</h3>
              <p className="text-2xl font-black text-green-600 mb-6">R$ {livro.preco.toFixed(2)}</p>
              <button onClick={() => adicionarAoCarrinho(livro)} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 active:scale-95 transition">ADICIONAR AO CARRINHO</button>
            </div>
          ))}
        </div>
      </main>

      {/* --- WIDGET IA JULIÃO --- */}
      <button onClick={() => setShowChat(!showChat)} className="fixed bottom-6 right-6 z-[9999]">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-all ${showChat ? 'bg-purple-600' : ''}`}>
          {showChat ? <X size={32} className="text-white" /> : <img src={fotoIA} className="w-full h-full rounded-full object-cover" alt="IA" />}
        </div>
      </button>

      {showChat && (
        <div className="fixed bottom-28 right-6 w-[340px] md:w-[400px] bg-white rounded-[2.5rem] shadow-2xl border z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-purple-600 p-6 text-white flex items-center gap-4">
            <img src={fotoIA} className="w-12 h-12 rounded-full border-2 border-white bg-white object-cover" alt="IA" />
            <div><p className="font-black text-lg">IA Julião</p><p className="text-[10px] text-purple-200 font-bold uppercase">Rastreando na Unção</p></div>
          </div>
          <div className="h-[300px] overflow-y-auto p-6 space-y-4 bg-slate-50">
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-semibold shadow-sm ${msg.role === 'bot' ? 'bg-white text-slate-700 border' : 'bg-purple-600 text-white'}`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-white flex gap-2 border-t">
            <input type="text" placeholder="Nome ou # do pedido..." className="flex-1 bg-slate-50 border p-3 rounded-xl outline-none text-sm" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && falarComIA()}/>
            <button onClick={falarComIA} className="bg-purple-600 text-white p-3 rounded-xl"><Send size={18}/></button>
          </div>
        </div>
      )}

      {/* MODAL CARRINHO / CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-8 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic">Seu Carrinho</h2>
              <button onClick={() => {setShowCheckout(false); setPedidoSucesso(null);}} className="text-slate-400 hover:text-red-500"><X size={32}/></button>
            </div>

            {pedidoSucesso ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle size={60}/></div>
                <h3 className="text-3xl font-black text-slate-800">GLÓRIA A DEUS!</h3>
                <p className="text-slate-500 font-medium">Seu pedido foi gerado com sucesso sob o número:</p>
                <div className="bg-purple-50 text-purple-700 px-8 py-4 rounded-3xl text-4xl font-black border-2 border-dashed border-purple-200">#{pedidoSucesso}</div>
                <p className="text-xs text-slate-400 font-bold px-8 uppercase">Guarde este número para rastrear com o Julião no chat!</p>
                <button onClick={() => {setShowCheckout(false); setPedidoSucesso(null);}} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">VOLTAR À LOJA</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {carrinho.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border">
                      <img src={item.imagem_url} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="font-bold text-slate-700 text-sm leading-tight mb-2">{item.nome}</p>
                        <div className="flex items-center gap-3">
                          <button onClick={() => alterarQuantidade(item.id, -1)} className="p-1 bg-white border rounded-md hover:bg-slate-100"><Minus size={14}/></button>
                          <span className="font-black text-sm">{item.quantidade}</span>
                          <button onClick={() => alterarQuantidade(item.id, 1)} className="p-1 bg-white border rounded-md hover:bg-slate-100"><Plus size={14}/></button>
                        </div>
                      </div>
                      <p className="font-black text-green-600 text-sm">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                    </div>
                  ))}
                  {carrinho.length === 0 && <p className="text-center text-slate-400 py-10 italic">O carrinho está vazio bença!</p>}
                </div>

                {carrinho.length > 0 && (
                  <div className="border-t pt-6 mt-6 space-y-4">
                    <div className="flex justify-between items-end mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase">Total Geral</span>
                      <span className="text-3xl font-black text-slate-900">R$ {carrinho.reduce((a, b) => a + (b.preco * b.quantidade), 0).toFixed(2)}</span>
                    </div>
                    <div className="space-y-2">
                      <input type="text" placeholder="Seu Nome Completo" className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:border-purple-300" value={dadosCadastro.nome} onChange={e => setDadosCadastro({...dadosCadastro, nome: e.target.value})} />
                      <input type="text" placeholder="WhatsApp (99) 99999-9999" className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none focus:border-purple-300" value={dadosCadastro.zap} onChange={e => setDadosCadastro({...dadosCadastro, zap: e.target.value})} />
                    </div>
                    <button onClick={finalizarCompra} disabled={isLoading} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-purple-700 disabled:bg-slate-300 transition-all">
                      {isLoading ? <><Loader2 className="animate-spin" /> PROCESSANDO NO CÉU...</> : "FINALIZAR E RECEBER PROTOCOLO"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;