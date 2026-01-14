
import React from 'react';
import { Contact } from '../types';

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
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${getCategoryColor(contact.category)}`}>
            {getCategoryLabel(contact.category)}
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-2">{contact.name}</h3>
          <p className="text-slate-500 text-sm">{contact.platform} · {contact.handle}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onDraft(contact)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Создать питч через ИИ"
          >
            <i className="fa-solid fa-pen-nib"></i>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 py-3 border-t border-b border-slate-50 my-4">
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Охват</p>
          <p className="font-bold text-slate-700">{contact.reach}</p>
        </div>
        <div className="w-px h-8 bg-slate-100"></div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Платформа</p>
          <p className="font-bold text-slate-600 truncate max-w-[80px]">{contact.platform}</p>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <p className="text-sm text-slate-600 line-clamp-3">
          {contact.notes}
        </p>
        <div className="flex flex-wrap gap-2">
          {contact.tags.map(tag => (
            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex gap-3">
        {contact.contactUrl ? (
          <a 
            href={contact.contactUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-paper-plane text-xs"></i> Связаться
          </a>
        ) : (
          <div className="flex-1 text-center py-2.5 text-slate-300 text-sm italic">Нет ссылки</div>
        )}
        <button 
           onClick={() => onDelete(contact.id)}
           className="px-4 py-2 border border-slate-200 text-slate-300 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
