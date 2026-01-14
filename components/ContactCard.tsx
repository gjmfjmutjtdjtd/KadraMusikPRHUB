
import React from 'react';
import { Contact } from '../types.ts';

interface ContactCardProps {
  contact: Contact;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDraft: (contact: Contact) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onEdit, onDelete, onDraft }) => {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Blogger': return 'bg-pink-100 text-pink-700';
      case 'Artist': return 'bg-purple-100 text-purple-700';
      case 'Agency': return 'bg-blue-100 text-blue-700';
      case 'Platform Curator': return 'bg-amber-100 text-amber-700';
      case 'Label Artist': return 'bg-indigo-100 text-indigo-700';
      case 'Media': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Blogger': return 'Блогер';
      case 'Artist': return 'Артист';
      case 'Agency': return 'Агентство';
      case 'Platform Curator': return 'Куратор';
      case 'Label Artist': return 'Артист лейбла';
      case 'Media': return 'СМИ';
      default: return cat;
    }
  };

  return (
    <div className="bg-white rounded-[40px] p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full group">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.15em] ${getCategoryColor(contact.category)}`}>
            {getCategoryLabel(contact.category)}
          </span>
          <h3 className="text-xl font-black text-slate-800 mt-3 tracking-tight">{contact.name}</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{contact.platform} · {contact.handle}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onDraft(contact)}
            className="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm bg-white border border-slate-50"
            title="Создать питч через ИИ"
          >
            <i className="fa-solid fa-wand-sparkles text-sm"></i>
          </button>
          <button 
            onClick={() => onEdit(contact.id)}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-xl transition-colors border border-slate-50"
            title="Редактировать"
          >
            <i className="fa-solid fa-pen text-xs"></i>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4 border-t border-b border-slate-50 my-6">
        <div className="text-center flex-1">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Охват</p>
          <p className="font-black text-slate-700">{contact.reach}</p>
        </div>
        <div className="w-px h-8 bg-slate-100"></div>
        <div className="text-center flex-1">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Платформа</p>
          <p className="font-black text-slate-600 truncate max-w-[80px]">{contact.platform}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-3">
          {contact.notes || <span className="text-slate-300 italic">Нет заметок</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {contact.tags.map(tag => (
            <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-3 py-1 rounded-lg font-black uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 flex gap-3">
        {contact.contactUrl ? (
          <a 
            href={contact.contactUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i> Связаться
          </a>
        ) : (
          <div className="flex-1 text-center py-4 text-slate-300 text-[10px] font-black uppercase tracking-widest italic border-2 border-dashed border-slate-50 rounded-2xl">Нет ссылки</div>
        )}
        <button 
           onClick={() => onDelete(contact.id)}
           className="w-12 h-12 border border-slate-100 text-slate-200 rounded-2xl hover:text-red-500 hover:bg-rose-50 hover:border-rose-100 transition-all flex items-center justify-center"
        >
          <i className="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
