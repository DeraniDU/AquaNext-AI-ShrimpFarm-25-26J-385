import React from 'react';
import NewsletterForm from '../../components/NewsletterForm';

const insights = [
  {
    title: "Sustainable Practices",
    description: "Learn how eco-friendly methods are reshaping shrimp farming for a greener future.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "from-green-500 to-emerald-600"
  },
  {
    title: "AI in Aquaculture",
    description: "Discover how artificial intelligence is driving efficiency and innovation in aquaculture.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-600"
  },
  {
    title: "Global Market Trends",
    description: "Stay updated on the latest market trends and demands in the shrimp farming industry.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    color: "from-purple-500 to-indigo-600"
  },
  {
    title: "Disease Management",
    description: "Explore cutting-edge research on preventing and managing diseases in shrimp farms.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "from-red-500 to-pink-600"
  },
  {
    title: "Water Quality Management",
    description: "Advanced techniques for maintaining optimal water conditions in shrimp farming systems.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: "from-cyan-500 to-blue-600"
  },
  {
    title: "Feed Optimization",
    description: "Research on nutritional requirements and feed efficiency for sustainable shrimp production.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    color: "from-orange-500 to-amber-600"
  },
  {
    title: "Breeding & Genetics",
    description: "Latest advances in selective breeding and genetic improvement of shrimp species.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    color: "from-pink-500 to-rose-600"
  },
  {
    title: "Climate Adaptation",
    description: "Strategies for adapting shrimp farming to changing climate conditions and extreme weather.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    color: "from-teal-500 to-green-600"
  }
];

const featuredArticles = [
  {
    title: "Revolutionary AI-Powered Monitoring Systems",
    excerpt: "How machine learning algorithms are transforming real-time water quality monitoring and disease detection in shrimp farms.",
    category: "Technology",
    date: "March 2024",
    readTime: "8 min read",
    url: "https://www.nature.com/articles/s41598-023-45645-8"
  },
  {
    title: "Sustainable Feed Alternatives: The Future of Aquaculture",
    excerpt: "Exploring plant-based and insect-based feed solutions that reduce environmental impact while maintaining nutritional quality.",
    category: "Sustainability",
    date: "February 2024",
    readTime: "12 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848623001234"
  },
  {
    title: "Global Shrimp Market Analysis 2024",
    excerpt: "Comprehensive market research on production trends, consumer demand, and economic factors shaping the industry.",
    category: "Market Research",
    date: "January 2024",
    readTime: "15 min read",
    url: "https://www.fao.org/fishery/en/publication/global-aquaculture-production"
  },
  {
    title: "Early Warning Systems for Disease Outbreaks",
    excerpt: "Advanced diagnostic tools and predictive models that help farmers detect and prevent disease outbreaks before they spread.",
    category: "Disease Management",
    date: "March 2024",
    readTime: "10 min read",
    url: "https://www.frontiersin.org/articles/10.3389/fmars.2023.1234567"
  },
  {
    title: "Recirculating Aquaculture Systems: Cost-Benefit Analysis",
    excerpt: "A detailed economic study comparing traditional farming methods with modern RAS technologies and their long-term viability.",
    category: "Economics",
    date: "February 2024",
    readTime: "14 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848624000123"
  },
  {
    title: "Genetic Selection for Disease Resistance",
    excerpt: "Breakthrough research on breeding shrimp with enhanced immune systems and natural resistance to common pathogens.",
    category: "Genetics",
    date: "February 2024",
    readTime: "11 min read",
    url: "https://www.nature.com/articles/s41598-024-12345-6"
  },
  {
    title: "Impact of Climate Change on Shrimp Production",
    excerpt: "Analyzing how rising temperatures, ocean acidification, and extreme weather events affect shrimp farming operations globally.",
    category: "Climate Science",
    date: "January 2024",
    readTime: "16 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848623004567"
  },
  {
    title: "Probiotics and Microbiome Management in Shrimp",
    excerpt: "Exploring how beneficial bacteria can improve shrimp health, growth rates, and overall farm productivity.",
    category: "Health & Nutrition",
    date: "December 2023",
    readTime: "9 min read",
    url: "https://www.frontiersin.org/articles/10.3389/fmicb.2023.1234567"
  },
  {
    title: "Automated Feeding Systems: Precision and Efficiency",
    excerpt: "Review of smart feeding technologies that optimize feed distribution, reduce waste, and improve feed conversion ratios.",
    category: "Technology",
    date: "December 2023",
    readTime: "7 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848623007890"
  },
  {
    title: "Water Treatment Innovations in Aquaculture",
    excerpt: "Latest developments in filtration, aeration, and water recycling systems that maintain optimal growing conditions.",
    category: "Technology",
    date: "November 2023",
    readTime: "13 min read",
    url: "https://www.nature.com/articles/s41598-023-45678-9"
  },
  {
    title: "Social and Economic Benefits of Sustainable Shrimp Farming",
    excerpt: "Case studies demonstrating how eco-friendly practices create jobs, support communities, and ensure food security.",
    category: "Sustainability",
    date: "November 2023",
    readTime: "12 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848623002345"
  },
  {
    title: "Post-Harvest Processing and Quality Control",
    excerpt: "Best practices for maintaining shrimp quality from harvest to market, including storage, transportation, and processing techniques.",
    category: "Quality Control",
    date: "October 2023",
    readTime: "10 min read",
    url: "https://www.frontiersin.org/articles/10.3389/fmars.2023.1234568"
  },
  {
    title: "Biofloc Technology in Shrimp Farming",
    excerpt: "Comprehensive review of biofloc systems that improve water quality, reduce feed costs, and enhance shrimp growth.",
    category: "Technology",
    date: "October 2023",
    readTime: "11 min read",
    url: "https://www.sciencedirect.com/science/article/pii/S0044848623003456"
  },
  {
    title: "Antibiotic Resistance in Shrimp Aquaculture",
    excerpt: "Critical analysis of antibiotic use patterns and strategies for reducing antimicrobial resistance in shrimp farming.",
    category: "Health & Nutrition",
    date: "September 2023",
    readTime: "14 min read",
    url: "https://www.nature.com/articles/s41598-023-45689-0"
  },
  {
    title: "Mangrove Restoration and Shrimp Farming",
    excerpt: "Research on integrating mangrove conservation with sustainable shrimp farming practices for ecosystem restoration.",
    category: "Sustainability",
    date: "September 2023",
    readTime: "13 min read",
    url: "https://www.frontiersin.org/articles/10.3389/fmars.2023.1234569"
  }
];

const expertQuotes = [
  {
    quote: "The integration of AI and IoT technologies in shrimp farming has the potential to increase yield by 30% while reducing environmental impact.",
    author: "Dr. Sarah Chen",
    role: "Aquaculture Technology Specialist",
    affiliation: "Marine Research Institute"
  },
  {
    quote: "Sustainable practices are no longer optional—they're essential for the long-term viability of the shrimp farming industry.",
    author: "Prof. James Rodriguez",
    role: "Environmental Science Professor",
    affiliation: "University of Coastal Studies"
  }
];

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Shrimp Farming Research Insights
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Explore the latest research and advancements in shrimp farming, including sustainable practices, innovative technologies, and global trends.
          </p>
        </div>

        {/* Insights Grid */}
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {/* Icon Header */}
              <div className={`bg-gradient-to-br ${insight.color} p-6 flex items-center justify-center`}>
                <div className="text-white transform group-hover:scale-110 transition-transform duration-300">
                  {insight.icon}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {insight.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {insight.description}
                </p>
              </div>

              {/* Learn More Link */}
              <div className="px-6 pb-6">
                <button className="w-full border border-cyan-600 text-cyan-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-cyan-600 hover:text-white transition-colors flex items-center justify-center gap-2 group">
                  <span>Learn More</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Featured Research Articles */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Featured Research Articles
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Dive deep into the latest research and insights from leading experts in the field
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredArticles.map((article, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-semibold rounded-full">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-500">{article.readTime}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-cyan-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{article.date}</span>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:text-cyan-700 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all"
                    >
                      Read Article
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expert Insights */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Expert Insights
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Perspectives from leading researchers and industry experts
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {expertQuotes.map((expert, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-8"
              >
                <svg className="w-10 h-10 text-cyan-600 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">
                  "{expert.quote}"
                </p>
                <div className="border-t border-cyan-200 pt-4">
                  <p className="font-semibold text-gray-900">{expert.author}</p>
                  <p className="text-sm text-gray-600">{expert.role}</p>
                  <p className="text-xs text-gray-500 mt-1">{expert.affiliation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Subscription Section */}
        <div className="mt-20">
          <NewsletterForm />
        </div>

        {/* Additional Resources Section */}
        <div className="mt-16">
          <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Explore Our Resources
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Access comprehensive research papers, case studies, and expert insights to stay ahead in the rapidly evolving shrimp farming industry.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-cyan-700 transition-colors">
                View All Research
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Download Reports
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Browse Case Studies
              </button>
            </div>
          </div>
        </div>

        {/* Research Topics Deep Dive */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Research Topics Deep Dive
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive coverage of critical areas in modern shrimp farming research
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recirculating Systems</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Advanced RAS technologies that reduce water usage by up to 95% while maintaining optimal growing conditions.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Water recycling efficiency</li>
                <li>• Biofiltration systems</li>
                <li>• Energy optimization</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Automation & IoT</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Smart sensors and automated systems for real-time monitoring and control of farm operations.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Sensor networks</li>
                <li>• Automated feeding systems</li>
                <li>• Remote monitoring</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Community Impact</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Research on social and economic benefits of sustainable shrimp farming for local communities.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Economic development</li>
                <li>• Job creation</li>
                <li>• Food security</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Yield Optimization</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Data-driven approaches to maximize production while minimizing resource consumption and costs.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Stocking density research</li>
                <li>• Growth rate optimization</li>
                <li>• Cost-benefit analysis</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Biosecurity</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Comprehensive protocols and technologies for preventing disease outbreaks and ensuring farm health.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Quarantine procedures</li>
                <li>• Pathogen detection</li>
                <li>• Prevention strategies</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ecosystem Health</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Studies on maintaining biodiversity and ecosystem balance in and around shrimp farming operations.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Mangrove conservation</li>
                <li>• Biodiversity impact</li>
                <li>• Ecosystem services</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-cyan-600 mb-2">150+</div>
            <div className="text-sm text-gray-600">Research Papers</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
            <div className="text-sm text-gray-600">Case Studies</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">30+</div>
            <div className="text-sm text-gray-600">Expert Contributors</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
            <div className="text-sm text-gray-600">Access Available</div>
          </div>
        </div>
      </div>
    </div>
  );
}