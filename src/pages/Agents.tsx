import { useNavigate } from 'react-router-dom';
import { Mail, Sparkles, ArrowRight, CheckCircle2, Zap, Target, TrendingUp } from 'lucide-react';

function AgentCard({
  title,
  description,
  features,
  icon,
  onOpen,
  comingSoon,
  badge,
  stats,
}: {
  title: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  onOpen?: () => void;
  comingSoon?: boolean;
  badge?: string;
  stats?: { label: string; value: string }[];
}) {
    return (
    <div className={`card p-6 h-full flex flex-col transition-all duration-300 ${comingSoon ? 'opacity-60' : 'hover:shadow-2xl hover:-translate-y-1'}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-white shadow-lg flex-shrink-0">
          {icon}
      </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {badge && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-brand text-white shadow-sm">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
              <div className="text-2xl font-bold text-brand-1">{stat.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
              </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-sm text-gray-700">
            <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        {comingSoon ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 text-gray-500 font-medium">
            <Sparkles size={16} />
            <span>Coming Soon</span>
          </div>
        ) : (
          <button
            onClick={onOpen}
            className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 group text-base font-semibold"
          >
            <span>Launch Agent</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}

export function AgentsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Zap className="text-white" size={24} />
              </div>
              <div>
              <h1 className="text-3xl font-bold">AI Agents</h1>
              <p className="text-white/90 text-sm mt-1">Intelligent assistants powered by Claude AI</p>
              </div>
            </div>
          <p className="text-white/95 text-base max-w-2xl leading-relaxed">
            Transform your workflow with AI agents that draft emails, manage follow-ups, and automate outreach—all personalized to your recipients' roles and positions.
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-white">
              <Target size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div className="text-sm text-gray-600">Active Agent</div>
            </div>
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">2</div>
              <div className="text-sm text-gray-600">Coming Soon</div>
            </div>
              </div>
            </div>
        <div className="card p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-500 flex items-center justify-center text-white">
              <Sparkles size={20} />
              </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">AI-Powered</div>
              <div className="text-sm text-gray-600">Claude Sonnet 4.5</div>
            </div>
              </div>
            </div>
          </div>

      {/* Agents Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-gradient-brand"></span>
          Available Agents
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AgentCard
            title="Email Expert"
            description="Your AI-powered email assistant that understands context, drafts professional emails tailored to each recipient's position, and automatically tracks follow-ups."
            features={[
              'Position-aware email generation',
              'Automatic 2-day follow-up tracking',
              'Gmail & Outlook integration',
              'Excel bulk email campaigns',
              'Rich text editor with formatting',
              'Import Outlook signatures',
            ]}
            icon={<Mail size={28} />}
            onOpen={() => navigate('/agents/email-expert')}
            badge="ACTIVE"
            stats={[
              { label: 'Providers', value: '2' },
              { label: 'Follow-ups', value: 'Auto' },
            ]}
          />

          <AgentCard
            title="Meeting Scheduler"
            description="Intelligently coordinate meetings across time zones, send calendar invites, manage RSVPs, and handle scheduling conflicts automatically."
            features={[
              'Smart time slot suggestions',
              'Timezone coordination',
              'Calendar integration',
              'RSVP tracking',
              'Automatic reminders',
            ]}
            icon={<Target size={28} />}
            comingSoon
          />

          <AgentCard
            title="Research Assistant"
            description="Analyze documents, extract key insights, generate comprehensive summaries, and produce executive briefs from multiple sources."
            features={[
              'Multi-document analysis',
              'Key insight extraction',
              'Executive summaries',
              'Source citation',
              'PDF & document support',
            ]}
            icon={<TrendingUp size={28} />}
            comingSoon
          />
              </div>
            </div>

      {/* CTA Section */}
      <div className="card p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-100">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white flex-shrink-0 shadow-lg">
            <Sparkles size={24} />
              </div>
                      <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">More AI Agents Coming Soon</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We're constantly developing new AI agents to help you work smarter. Each agent is powered by Claude Sonnet 4.5 for maximum intelligence and reliability.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-brand-1 border border-brand-1/20">
                🚀 Task Automation
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-brand-1 border border-brand-1/20">
                📊 Data Analysis
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-brand-1 border border-brand-1/20">
                💡 Content Creation
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-brand-1 border border-brand-1/20">
                🎯 Lead Generation
                          </span>
                        </div>
                    </div>
            </div>
          </div>
    </div>
  );
}

export default AgentsPage;
