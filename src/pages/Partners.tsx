import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Building2, Package, Server, 
  ShoppingCart, Cloud, Database, Shield, TrendingUp,
  ExternalLink, FileText, ChevronDown, X, BarChart3,
  PieChart, Users
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Solution {
  Department: string;
  'System Name': string;
  'Partner / Company': string;
  Category: string;
  'Use Cases': string;
  Strengths: string;
  Weaknesses: string;
  'Target Sector': string;
  'Deployment Type': string;
}

interface Service {
  Department: string;
  Service: string;
  'Service Name': string;
  Description: string;
  'Delivery Method': string;
  'Service Outcomes': string;
}

export function PartnersPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'solutions' | 'services'>('solutions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadExcelData();
  }, []);

  async function loadExcelData() {
    try {
      const response = await fetch('/System(solutions).xlsx');
      if (!response.ok) {
        throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Log available sheet names for debugging
      console.log('Available sheets:', workbook.SheetNames);

      // Read solutions sheet - try multiple possible names
      const solutionsSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('solution')
      );
      if (solutionsSheetName) {
        const solutionsSheet = workbook.Sheets[solutionsSheetName];
        const solutionsData = XLSX.utils.sheet_to_json<Solution>(solutionsSheet);
        console.log(`Loaded ${solutionsData.length} solutions from sheet: ${solutionsSheetName}`);
        setSolutions(solutionsData);
      } else {
        console.warn('No solutions sheet found');
      }

      // Read services sheet - try multiple possible names
      const servicesSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('service')
      );
      if (servicesSheetName) {
        const servicesSheet = workbook.Sheets[servicesSheetName];
        const servicesData = XLSX.utils.sheet_to_json<Service>(servicesSheet);
        console.log(`Loaded ${servicesData.length} services from sheet: ${servicesSheetName}`);
        setServices(servicesData);
      } else {
        console.warn('No services sheet found');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setLoading(false);
    }
  }

  // Get unique values for filters
  const departments = ['all', ...Array.from(new Set(solutions.map(s => s.Department).filter(Boolean)))];
  const categories = ['all', ...Array.from(new Set(solutions.map(s => s.Category).filter(Boolean)))];
  const sectors = ['all', ...Array.from(new Set(solutions.map(s => s['Target Sector']).filter(Boolean)))];

  // Filter solutions
  const filteredSolutions = solutions.filter(solution => {
    const matchesSearch = !searchTerm || 
      solution['System Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution['Partner / Company']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solution['Use Cases']?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || solution.Department === selectedDepartment;
    const matchesCategory = selectedCategory === 'all' || solution.Category === selectedCategory;
    const matchesSector = selectedSector === 'all' || solution['Target Sector'] === selectedSector;

    return matchesSearch && matchesDepartment && matchesCategory && matchesSector;
  });

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
      service['Service Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.Service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.Description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || service.Department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Chart data - Deployment Types
  const deploymentTypes = solutions.reduce((acc, solution) => {
    const type = solution['Deployment Type'] || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deploymentChartData = {
    labels: Object.keys(deploymentTypes),
    datasets: [{
      label: 'Systems by Deployment Type',
      data: Object.values(deploymentTypes),
      backgroundColor: [
        'rgba(139, 69, 19, 0.8)',
        'rgba(255, 140, 0, 0.8)',
        'rgba(255, 165, 0, 0.8)',
        'rgba(255, 69, 0, 0.8)',
        'rgba(139, 90, 43, 0.8)',
      ],
      borderColor: [
        'rgba(139, 69, 19, 1)',
        'rgba(255, 140, 0, 1)',
        'rgba(255, 165, 0, 1)',
        'rgba(255, 69, 0, 1)',
        'rgba(139, 90, 43, 1)',
      ],
      borderWidth: 2,
    }],
  };

  // Chart data - Department Distribution
  const departmentCounts = solutions.reduce((acc, solution) => {
    const dept = solution.Department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentChartData = {
    labels: Object.keys(departmentCounts),
    datasets: [{
      label: 'Systems by Department',
      data: Object.values(departmentCounts),
      backgroundColor: 'rgba(139, 69, 19, 0.8)',
      borderColor: 'rgba(139, 69, 19, 1)',
      borderWidth: 2,
    }],
  };

  const clearFilters = () => {
    setSelectedDepartment('all');
    setSelectedCategory('all');
    setSelectedSector('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-brand-1 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-brand bg-clip-text text-transparent">
            Partners & Solutions
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive overview of systems and cybersecurity services</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`btn flex items-center gap-2 ${showFilters ? 'btn-primary' : 'btn-outline'}`}
          >
            <Filter size={18} />
            Filters
          </motion.button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-padding bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Solutions</p>
              <p className="text-3xl font-bold text-brand-1 mt-1">{solutions.length}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Package className="text-brand-1" size={28} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-padding bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Services</p>
              <p className="text-3xl font-bold text-brand-2 mt-1">{services.length}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Shield className="text-brand-2" size={28} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-padding bg-gradient-to-br from-red-50 to-red-100 border-red-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Partners</p>
              <p className="text-3xl font-bold text-red-700 mt-1">
                {new Set(solutions.map(s => s['Partner / Company']).filter(Boolean)).size}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Users className="text-red-700" size={28} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-padding bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Departments</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{departments.length - 1}</p>
            </div>
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Building2 className="text-blue-700" size={28} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card card-padding overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filter Options</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-brand-1 hover:text-brand-2 font-medium flex items-center gap-1"
              >
                <X size={14} />
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-1 focus:border-transparent"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept === 'all' ? 'All Departments' : dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-1 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Sector</label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-1 focus:border-transparent"
                >
                  {sectors.map(sector => (
                    <option key={sector} value={sector}>{sector === 'all' ? 'All Sectors' : sector}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search systems, partners, services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-1 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-padding"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="text-brand-1" size={20} />
            <h3 className="font-semibold text-gray-900">Deployment Types Distribution</h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Pie data={deploymentChartData} options={{ maintainAspectRatio: false, responsive: true }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card card-padding"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-brand-2" size={20} />
            <h3 className="font-semibold text-gray-900">Systems by Department</h3>
          </div>
          <div className="h-64">
            <Bar 
              data={departmentChartData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                scales: {
                  y: { beginAtZero: true }
                }
              }} 
            />
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('solutions')}
            className={`pb-3 px-4 font-medium transition-all relative ${
              activeTab === 'solutions'
                ? 'text-brand-1'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Server size={18} />
              Solutions
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">
                {filteredSolutions.length}
              </span>
            </div>
            {activeTab === 'solutions' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-brand"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 px-4 font-medium transition-all relative ${
              activeTab === 'services'
                ? 'text-brand-1'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield size={18} />
              Cybersecurity Services
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">
                {filteredServices.length}
              </span>
            </div>
            {activeTab === 'services' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-brand"
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'solutions' ? (
          <motion.div
            key="solutions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredSolutions.map((solution, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5 }}
                className="card overflow-hidden group cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === `sol-${idx}` ? null : `sol-${idx}`)}
              >
                <div className="h-2 bg-gradient-brand" />
                <div className="card-padding">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 flex-1">
                      {solution['System Name']}
                    </h3>
                    <motion.div
                      animate={{ rotate: expandedCard === `sol-${idx}` ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={20} className="text-gray-400" />
                    </motion.div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-brand-1" />
                      <span className="text-sm text-gray-600">{solution['Partner / Company']}</span>
                    </div>
                    {solution.Department && (
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-100 text-orange-800">
                        {solution.Department}
                      </span>
                    )}
                    {solution.Category && (
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 ml-2">
                        {solution.Category}
                      </span>
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedCard === `sol-${idx}` && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 border-t pt-3"
                      >
                        {solution['Use Cases'] && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Use Cases</p>
                            <p className="text-sm text-gray-600">{solution['Use Cases']}</p>
                          </div>
                        )}
                        {solution.Strengths && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                            <p className="text-sm text-gray-600">{solution.Strengths}</p>
                          </div>
                        )}
                        {solution.Weaknesses && (
                          <div>
                            <p className="text-xs font-semibold text-red-700 mb-1">Weaknesses</p>
                            <p className="text-sm text-gray-600">{solution.Weaknesses}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {solution['Target Sector'] && (
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-600">Target Sector</p>
                              <p className="text-sm font-medium text-blue-800">{solution['Target Sector']}</p>
                            </div>
                          )}
                          {solution['Deployment Type'] && (
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-600">Deployment</p>
                              <p className="text-sm font-medium text-purple-800">{solution['Deployment Type']}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {filteredServices.map((service, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5 }}
                className="card overflow-hidden group"
              >
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500" />
                <div className="card-padding">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Shield size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {service['Service Name']}
                      </h3>
                      {service.Service && (
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800">
                          {service.Service}
                        </span>
                      )}
                    </div>
                  </div>

                  {service.Description && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 leading-relaxed">{service.Description}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {service.Department && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Department</span>
                        <span className="text-sm font-medium">{service.Department}</span>
                      </div>
                    )}
                    {service['Delivery Method'] && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Delivery Method</span>
                        <span className="text-sm font-medium text-purple-800">{service['Delivery Method']}</span>
                      </div>
                    )}
                    {service['Service Outcomes'] && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs font-semibold text-green-700 mb-1">Service Outcomes</p>
                        <p className="text-sm text-gray-700">{service['Service Outcomes']}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      {((activeTab === 'solutions' && filteredSolutions.length === 0) ||
        (activeTab === 'services' && filteredServices.length === 0)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <FileText size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="btn btn-primary"
          >
            Clear Filters
          </button>
        </motion.div>
      )}
    </div>
  );
}


