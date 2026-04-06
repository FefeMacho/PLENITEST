import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingCart, User, Clock, CheckCircle, 
  Package, BookOpen, Plus, X, Upload, Trash2, Eye, Calendar,
  ChevronLeft, ChevronRight, MessageCircle, Send, Bot
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
  
  // --- ESTADOS LOJA ---
  const [carrinho, setCarrinho] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  
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
    { role: 'bot', text: 'Paz do Senhor! Sou o IA Julião 🤖. Digite seu nome completo para eu rastrear seu pedido!' }
  ]);

  // --- EFEITOS ---
  useEffect(() => {
    carregarProdutos();
    if (isAdmin) {
      carregarPedidos();
    } else {
      const timer = setInterval(() => {
        setBannerAtual((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isAdmin, banners.length]);

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

  // --- FUNÇÕES DA LOJA ---
  const adicionarAoCarrinho = (p) => {
    setCarrinho([...carrinho, p]);
    setMensagem({ tipo: 'sucesso', texto: `${p.nome} adicionado!` });
    setTimeout(() => setMensagem(null), 2000);
  };

  const finalizarCompra = async () => {
    if (!clienteNome || carrinho.length === 0) return alert("Preencha seu nome para entrega zé!");
    try {
      await axios.post(`${API_URL}/pedidos`, {
        cliente: clienteNome,
        produtos: carrinho.map(p => ({ nome: p.nome, quantidade: 1 }))
      });
      setMensagem({ tipo: 'sucesso', texto: 'Pedido enviado ao sistema!' });
      setCarrinho([]);
      setShowCheckout(false);
      setClienteNome('');
      setTimeout(() => setMensagem(null), 3000);
    } catch (err) { alert("Erro ao salvar pedido no banco."); }
  };

  // --- FUNÇÕES DA IA ---
  const falarComIA = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatLog(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const res = await axios.get(`${API_URL}/rastreio/${userMsg}`);
      const dados = res.data;

      if (dados.length === 0) {
        setChatLog(prev => [...prev, { role: 'bot', text: `Irmão(ã) ${userMsg}, confirma ai se ta certo o nome, porque eu não encontrei nenhum pedido no seu nome.` }]);
      } else {
        const p = dados[0]; 
        let resposta = `Achei seu pedido #${p.id}! 🎉\n\nItens: ${p.itens}\nStatus Atual: ${p.status.toUpperCase()}\n\n`;
        
        if (p.status === 'pendente') resposta += "Ainda estamos preparando os livros com muito carinho! 📚";
        else if (p.status === 'processando') resposta += "Seu pedido já está sendo embalado e logo sairá para entrega! 📦";
        else resposta += "Glória a Deus! Seu pedido já foi finalizado e concluído. 🙌";

        setChatLog(prev => [...prev, { role: 'bot', text: resposta }]);
      }
    } catch (err) {
      setChatLog(prev => [...prev, { role: 'bot', text: "Joãozinho deve ter tropeçado nos cabo denovo, vou avisar o Bruno turini e ja volto!" }]);
    }
  };

  // --- FUNÇÕES DO ADM ---
  const atualizarStatusPedido = async (id, novoStatus) => {
    try {
      await axios.put(`${API_URL}/pedidos/${id}/status`, { novoStatus });
      carregarPedidos();
      setMensagem({ tipo: 'sucesso', texto: 'Status Atualizado!' });
      setTimeout(() => setMensagem(null), 2000);
    } catch (err) { alert(err.response?.data?.error || "Erro ao atualizar"); }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Tem certeza que deseja apagar esse livro do sistema?")) return;
    try {
      await axios.delete(`${API_URL}/produtos/${id}`);
      setMensagem({ tipo: 'sucesso', texto: 'Produto removido com sucesso!' });
      carregarProdutos();
      setTimeout(() => setMensagem(null), 2000);
    } catch (err) { alert("Erro ao excluir."); }
  };

  const cadastrarLivro = async () => {
    if (!novoLivro.nome || !novoLivro.preco || !novoLivro.foto) return alert("Preencha todos os campos e anexe a foto!");
    const data = new FormData();
    data.append('nome', novoLivro.nome);
    data.append('preco', novoLivro.preco);
    data.append('foto', novoLivro.foto);
    try {
      await axios.post(`${API_URL}/produtos`, data);
      setShowModalNovo(false);
      setNovoLivro({ nome: '', preco: '', foto: null });
      carregarProdutos();
      setMensagem({ tipo: 'sucesso', texto: 'Novo livro cadastrado com foto!' });
      setTimeout(() => setMensagem(null), 3000);
    } catch (err) { console.error(err); }
  };

  const salvarPreco = async (id, preco) => {
  // 1. Transformamos a string em número
  const precoNumerico = parseFloat(preco);

  // 2. Verificamos se é um número válido (isNaN) e se é positivo
  if (isNaN(precoNumerico) || precoNumerico <= 0) {
    alert("Por favor, insira um preço válido maior que zero.");
    return; // Interrompe a execução aqui
  }

  try {
    // 3. Se passou na validação, enviamos para a API
    await axios.put(`${API_URL}/produtos/${id}`, { preco: precoNumerico });
    setMensagem({ tipo: 'sucesso', texto: 'Preço atualizado no site!' });
    carregarProdutos();
    setTimeout(() => setMensagem(null), 2000);
  } catch (err) {
    alert('Erro ao salvar novo preço.');
  }
};

  // ==========================================
  // RENDERIZAÇÃO: PAINEL ADMINISTRATIVO
  // ==========================================
  if (isAdmin) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans p-6 text-slate-900 relative">
        <div className="max-w-7xl mx-auto">
          
          <header className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-2 italic tracking-tighter">
                <Package className="text-purple-600" size={32} /> PAINEL GESTÃO Leitura Crente
              </h1>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setAbaAdm('pedidos')} className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${abaAdm === 'pedidos' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Pedidos</button>
                <button onClick={() => setAbaAdm('estoque')} className={`px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${abaAdm === 'estoque' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Estoque</button>
              </div>
            </div>
            <a href="/" className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm border border-blue-100 hover:bg-blue-100 transition">Sair do Painel</a>
          </header>

          {mensagem && <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[150] bg-green-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl animate-bounce">{mensagem.texto}</div>}

          {abaAdm === 'pedidos' ? (
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-widest">
                  <tr><th className="p-6">ID</th><th className="p-6">Cliente</th><th className="p-6">Status</th><th className="p-6 text-center">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition cursor-pointer group" onClick={() => setPedidoSelecionado(p)}>
                      <td className="p-6 font-mono text-purple-600 font-bold">#{p.id}</td>
                      <td className="p-6 font-bold text-slate-700 flex items-center gap-2">
                        {p.cliente} <Eye size={14} className="opacity-0 group-hover:opacity-100 text-slate-300 transition" />
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'finalizado' ? 'bg-green-100 text-green-700' : p.status === 'processando' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-6 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {p.status !== 'finalizado' ? (
                          <>
                            <button onClick={() => atualizarStatusPedido(p.id, 'processando')} className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-100" title="Processar"><Clock size={18}/></button>
                            <button onClick={() => atualizarStatusPedido(p.id, 'finalizado')} className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-100" title="Finalizar"><CheckCircle size={18}/></button>
                          </>
                        ) : <span className="text-slate-300 text-xs italic">Concluído</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pedidos.length === 0 && <div className="p-20 text-center text-slate-400 italic">Nenhum pedido encontrado.</div>}
            </div>
          ) : (
            <div className="space-y-6">
              <button onClick={() => setShowModalNovo(true)} className="w-full py-8 bg-white border-2 border-dashed border-purple-200 rounded-[2.5rem] text-purple-600 font-black hover:bg-purple-50 transition-all flex items-center justify-center gap-3">
                <Plus size={24} /> ADICIONAR NOVO PRODUTO AO BANCO
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {produtos.map(prod => (
                  <div key={prod.id} className="bg-white p-5 rounded-[2rem] border flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <img src={prod.imagem_url} className="w-14 h-14 rounded-xl object-cover border" alt={prod.nome} />
                      <h3 className="font-bold text-slate-700 text-sm">{prod.nome}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-300 uppercase">Preço</p>
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border">
                           <span className="text-xs text-slate-400">R$</span>
                           <input type="number" step="0.01" defaultValue={prod.preco} onBlur={(e) => salvarPreco(prod.id, e.target.value)} className="w-16 bg-transparent text-right font-black text-green-600 outline-none text-xs" />
                        </div>
                      </div>
                      <button onClick={() => excluirProduto(prod.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Excluir">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- MODAIS DO ADM --- */}
        
        {/* Modal: Detalhes do Pedido */}
        {pedidoSelecionado && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden border border-white/20">
              <div className="absolute top-0 left-0 right-0 h-2 bg-purple-600"></div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Pedido #{pedidoSelecionado.id}</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Detalhes da Transação</p>
                </div>
                <button onClick={() => setPedidoSelecionado(null)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all"><X size={32} /></button>
              </div>
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User size={12} /> Cliente Responsável</p>
                  <p className="text-2xl font-bold text-slate-800">{pedidoSelecionado.cliente}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Produtos Comprados</p>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                    {pedidoSelecionado.itens_resumo ? pedidoSelecionado.itens_resumo.split(', ').map((item, idx) => {
                      const [nome, qtd] = item.split(' (');
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3 text-slate-700 font-semibold"><BookOpen size={18} className="text-purple-300" /> {nome}</div>
                          <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-lg text-[10px] font-black">{qtd ? qtd.replace(')', '') : 'x1'}</span>
                        </div>
                      );
                    }) : <p className="text-slate-400 italic text-sm text-center py-4">Nenhum item vinculado.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Novo Produto */}
        {showModalNovo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black uppercase italic mb-8">Novo Livro</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nome do Livro" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setNovoLivro({...novoLivro, nome: e.target.value})} />
                <input type="number" placeholder="Preço (R$)" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none" onChange={e => setNovoLivro({...novoLivro, preco: e.target.value})} />
                <div className="relative">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition group">
                    <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-purple-500" />
                    <p className="text-xs text-slate-500 font-bold text-center px-4">{novoLivro.foto ? novoLivro.foto.name : "Subir Foto da Capa"}</p>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setNovoLivro({...novoLivro, foto: e.target.files[0]})} />
                  </label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowModalNovo(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600 transition">Cancelar</button>
                <button onClick={cadastrarLivro} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 transition">SALVAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: INTERFACE DA LOJA (CLIENTE)
  // ==========================================
  return (
    <div className="min-h-screen w-full bg-white text-slate-900 font-sans relative overflow-x-hidden">
      
      <header className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-50 py-5 px-8 flex justify-between items-center shadow-sm w-full">
        <img src={logo} className="h-10 w-auto" alt="Logo" />
        <button onClick={() => setShowCheckout(true)} className="relative p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition">
          <ShoppingCart size={28} className="text-purple-700" />
          {carrinho.length > 0 && <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce">{carrinho.length}</span>}
        </button>
      </header>

      {mensagem && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-xl">{mensagem.texto}</div>}

      <main className="w-full max-w-7xl mx-auto px-4 py-10">
        
        {/* CARROSSEL */}
        <div className="relative w-full aspect-[16/7] md:aspect-[21/9] rounded-[3rem] overflow-hidden mb-16 shadow-2xl group border-4 border-white">
          <img 
            src={banners[bannerAtual]} 
            className="w-full h-full object-cover object-center transition-all duration-1000 ease-in-out group-hover:scale-105" 
            alt="Banner Promocional" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
          <button onClick={() => setBannerAtual(bannerAtual === 0 ? banners.length - 1 : bannerAtual - 1)} className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md p-4 rounded-full text-slate-800 opacity-0 group-hover:opacity-100 transition-all z-10"><ChevronLeft size={28} /></button>
          <button onClick={() => setBannerAtual(bannerAtual === banners.length - 1 ? 0 : bannerAtual + 1)} className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-4 rounded-full text-slate-800 opacity-0 group-hover:opacity-100 transition-all z-10"><ChevronRight size={28} /></button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => setBannerAtual(idx)} className={`h-2.5 rounded-full transition-all duration-700 ${idx === bannerAtual ? 'bg-white w-12 shadow-lg' : 'bg-white/40 w-2.5'}`} />
            ))}
          </div>
        </div>

        <h2 className="text-3xl font-black mb-12 italic border-l-8 border-purple-600 pl-6 uppercase tracking-tighter">Novidades</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {produtos.map(livro => (
            <div key={livro.id} className="flex flex-col group cursor-pointer">
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden mb-6 bg-slate-50 shadow-sm group-hover:shadow-2xl transition-all relative">
                <img src={livro.imagem_url} className="w-full h-full object-cover group-hover:scale-110 duration-700" alt={livro.nome} />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1 leading-tight group-hover:text-purple-600 transition">{livro.nome}</h3>
              <p className="text-2xl font-black text-green-600 mb-6">R$ {livro.preco.toFixed(2)}</p>
              <button onClick={() => adicionarAoCarrinho(livro)} className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 shadow-lg active:scale-95 transition">ADICIONAR AO CARRINHO</button>
            </div>
          ))}
        </div>
      </main>

      {/* --- WIDGET DA IA DE RASTREIO --- */}
      <button onClick={() => setShowChat(!showChat)} className="fixed bottom-6 right-6 p-1 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-110 transition-all z-[9999] active:scale-95 group">
        {showChat ? (
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg"><X size={32} className="text-white" /></div>
        ) : (
          <div className="relative">
             <img src={fotoIA} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg bg-purple-600" alt="IA" />
             <span className="absolute top-0 right-0 flex h-4 w-4">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border border-white"></span>
             </span>
          </div>
        )}
      </button>

      {showChat && (
        <div className="fixed bottom-28 right-6 w-[340px] md:w-[400px] bg-white rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-slate-100 z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-purple-600 p-6 text-white flex items-center gap-4">
            <div className="relative"><img src={fotoIA} className="w-14 h-14 rounded-full border-2 border-white/50 object-cover shadow-md bg-white" alt="IA" /></div>
            <div>
              <p className="font-black text-xl leading-none">IA Julião</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-purple-200 uppercase font-black tracking-widest">Online Agora</p>
              </div>
            </div>
          </div>
          <div className="h-[380px] overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar">
            {chatLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'bot' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-semibold shadow-sm whitespace-pre-wrap ${msg.role === 'bot' ? 'bg-white text-slate-700 rounded-tl-none border' : 'bg-purple-600 text-white rounded-tr-none'}`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="p-5 bg-white border-t border-slate-100 flex gap-2">
            <input type="text" placeholder="Digite seu nome..." className="flex-1 bg-slate-50 border p-4 rounded-2xl outline-none text-sm font-bold focus:border-purple-300" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && falarComIA()}/>
            <button onClick={falarComIA} className="bg-purple-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Send size={20}/></button>
          </div>
        </div>
      )}

      {/* MODAL CARRINHO */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-10 flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-slate-800 uppercase italic flex items-center gap-3"><ShoppingCart className="text-purple-600" size={32}/> Carrinho</h2>
              <button onClick={() => setShowCheckout(false)} className="text-slate-300 hover:text-red-500"><X size={40}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {carrinho.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] border">
                  <img src={item.imagem_url} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 font-bold text-slate-700 text-sm">{item.nome}</div>
                  <button onClick={() => setCarrinho(carrinho.filter((_, i) => i !== idx))}><Trash2 size={20} className="text-red-300"/></button>
                </div>
              ))}
            </div>
            {carrinho.length > 0 && (
              <div className="border-t pt-8 mt-8 space-y-6">
                <div className="flex justify-between items-end mb-2 px-2">
                   <span className="font-bold text-slate-400 uppercase text-[10px]">Total Compra</span>
                   <span className="text-3xl font-black text-slate-800">R$ {carrinho.reduce((a,b)=>a+b.preco,0).toFixed(2)}</span>
                </div>
                <input type="text" placeholder="Nome Completo para entrega" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" value={clienteNome} onChange={e => setClienteNome(e.target.value)} />
                <button onClick={finalizarCompra} className="w-full py-6 bg-purple-600 text-white rounded-3xl font-black shadow-xl">FINALIZAR PEDIDO</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;