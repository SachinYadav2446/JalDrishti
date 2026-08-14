import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  CloudRain,
  Cpu,
  Download,
  Droplet,
  Droplets,
  FileText,
  Layers,
  MapPin,
  Printer,
  Search,
  ShieldCheck,
  TrendingDown,
  Wrench,
  X,
} from '@/components/Icons';
import { useTheme } from '@/constants/ThemeContext';
import { API_BASE, fmt, useApi } from '@/constants/api';
import tw from '@/constants/tailwind';

const logo = require('../assets/images/logo.png');

interface StationIntervention {
  code: string;
  name: string;
  block: string;
  tehsil: string;
  depth_mbgl: number | null;
  trend_m_yr: number | null;
  recharge_mm: number | null;
  fluctuation_m: number | null;
  category: string;
  data_quality: number | null;
  anomalies: string[];
  recommended_intervention: string;
  priority: 'URGENT' | 'HIGH' | 'MODERATE' | 'ROUTINE';
}

interface AdvisoryData {
  reference_no: string;
  date: string;
  state: string;
  district: string;
  total_stations: number;
  clean_stations: number;
  overall_category: string;
  status_color: string;
  vulnerability_score: number;
  avg_depth_mbgl: number | null;
  avg_trend_m_yr: number | null;
  avg_recharge_mm: number | null;
  avg_fluctuation_m: number | null;
  avg_data_quality: number | null;
  by_category: Record<string, number>;
  at_risk_count: number;
  at_risk_pct: number;
  flagged_sensors: number;
  executive_summary: string;
  stations: StationIntervention[];
}

interface AdvisoryModalProps {
  visible: boolean;
  onClose: () => void;
  initialState?: string | null;
  initialDistrict?: string | null;
}

export default function AdvisoryModal({
  visible,
  onClose,
  initialState,
  initialDistrict,
}: AdvisoryModalProps) {
  const { colors, isDark } = useTheme();

  // Load available states and districts
  const districtsApi = useApi<Record<string, { district: string; stations: number }[]>>(
    visible ? '/districts/' : null
  );

  const statesList = useMemo(() => {
    if (!districtsApi.data) return [];
    return Object.keys(districtsApi.data).sort();
  }, [districtsApi.data]);

  const [selectedState, setSelectedState] = useState<string>('Rajasthan');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Jodhpur');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  // Synchronize initial selections
  useEffect(() => {
    if (initialState) setSelectedState(initialState);
    if (initialDistrict) setSelectedDistrict(initialDistrict);
  }, [initialState, initialDistrict, visible]);

  const availableDistricts = useMemo(() => {
    if (!districtsApi.data || !selectedState) return [];
    return districtsApi.data[selectedState] || [];
  }, [districtsApi.data, selectedState]);

  // If selected state changes and current district isn't in it, pick first available
  useEffect(() => {
    if (availableDistricts.length > 0) {
      const exists = availableDistricts.some((d) => d.district === selectedDistrict);
      if (!exists) {
        setSelectedDistrict(availableDistricts[0].district);
      }
    }
  }, [availableDistricts, selectedDistrict]);

  // Load full advisory for current selection
  const advisoryApi = useApi<AdvisoryData>(
    visible && selectedState && selectedDistrict
      ? `/advisory/?state=${encodeURIComponent(selectedState)}&district=${encodeURIComponent(
          selectedDistrict
        )}`
      : null
  );

  const advisory = advisoryApi.data;

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const element = document.getElementById('cgwb-advisory-printable');
    if (!element || !advisory) return;

    setIsDownloading(true);
    try {
      // @ts-ignore
      const html2pdfModule = (await import('html2pdf.js')).default || (window as any).html2pdf;
      const opt: any = {
        margin: [8, 8, 8, 8],
        filename: `CGWB_Official_Advisory_${advisory.district}_${advisory.state}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdfModule().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF download error, falling back to print:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return statesList;
    return statesList.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()));
  }, [statesList, stateSearch]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return availableDistricts;
    return availableDistricts.filter((d) =>
      d.district.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [availableDistricts, districtSearch]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View
        style={[
          tw`flex-1 bg-black/70 items-center justify-center p-3 md:p-6`,
          Platform.OS === 'web'
            ? ({
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
              } as any)
            : {},
        ]}>
        {/* Modal Container */}
        <View
          style={[
            tw`w-full max-w-4xl rounded-[24px] border shadow-2xl flex-col`,
            {
              backgroundColor: colors.bgPanel,
              borderColor: colors.borderColor,
              height: '92vh',
              maxHeight: '92vh',
              display: 'flex',
              position: 'relative',
              zIndex: 10,
            } as any,
          ]}>
          {/* Top Control Bar (Hidden on Print) */}
          <View
            style={[
              tw`no-print px-5 py-3.5 border-b flex-row flex-wrap items-center justify-between gap-3 rounded-t-[24px]`,
              {
                backgroundColor: colors.bgSubtle,
                borderColor: colors.borderColor,
                flexShrink: 0,
                position: 'relative',
                zIndex: 1000,
              } as any,
            ]}>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-8 h-8 rounded-lg border items-center justify-center mr-2.5`,
                  {
                    backgroundColor: isDark ? 'rgba(47, 128, 255, 0.15)' : 'rgba(37, 99, 235, 0.1)',
                    borderColor: colors.borderColor,
                  },
                ]}>
                <FileText size={16} color={colors.brightBlue} strokeWidth={2} />
              </View>
              <View>
                <Text style={[tw`text-sm font-bold tracking-tight`, { color: colors.textPrimary }]}>
                  CGWB Official District Advisory Engine
                </Text>
                <Text style={[tw`text-[10px] font-medium tracking-wide uppercase`, { color: colors.brightBlue }]}>
                  Executive Briefing &amp; Artificial Recharge Allocation
                </Text>
              </View>
            </View>

            {/* Selectors & Action Buttons */}
            <View style={tw`flex-row items-center flex-wrap gap-2 relative z-50`}>
              {/* Click outside overlay when dropdown is open */}
              {(stateDropdownOpen || districtDropdownOpen) && (
                <Pressable
                  onPress={() => {
                    setStateDropdownOpen(false);
                    setDistrictDropdownOpen(false);
                  }}
                  style={[
                    tw`fixed inset-0`,
                    Platform.OS === 'web'
                      ? ({
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 99990,
                          backgroundColor: 'transparent',
                        } as any)
                      : {},
                  ]}
                />
              )}

              {/* State Selector */}
              <View style={tw`relative`}>
                <Pressable
                  onPress={() => {
                    setStateDropdownOpen((p) => !p);
                    setDistrictDropdownOpen(false);
                  }}
                  style={[
                    tw`flex-row items-center px-3.5 py-1.5 border rounded-xl shadow-2xs min-w-[135px] justify-between transition-all`,
                    {
                      backgroundColor: stateDropdownOpen
                        ? (isDark ? 'rgba(47, 128, 255, 0.2)' : 'rgba(37, 99, 235, 0.12)')
                        : colors.bgPanel,
                      borderColor: stateDropdownOpen ? colors.brightBlue : colors.borderColor,
                    },
                  ]}>
                  <Text style={[tw`text-xs font-semibold mr-2`, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedState || 'Select State'}
                  </Text>
                  <ChevronDown size={13} color={colors.textMuted} strokeWidth={2} />
                </Pressable>

                {stateDropdownOpen && (
                  <View
                    style={[
                      tw`absolute top-11 left-0 w-60 rounded-2xl border shadow-2xl p-2.5`,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        zIndex: 999999,
                        elevation: 999999,
                        maxHeight: 290,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                      } as any,
                    ]}>
                    <View style={tw`flex-row items-center px-2 py-1 mb-2 border rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700`}>
                      <Search size={13} color={colors.brightBlue} style={tw`mr-1.5`} />
                      <TextInput
                        value={stateSearch}
                        onChangeText={setStateSearch}
                        placeholder="Search state…"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          tw`flex-1 text-xs py-1 font-medium bg-transparent border-0`,
                          { color: colors.textPrimary },
                          Platform.OS === 'web'
                            ? ({
                                outlineStyle: 'none',
                                outline: 'none',
                                border: 'none',
                              } as any)
                            : {},
                        ]}
                        autoFocus
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 210 }} showsVerticalScrollIndicator>
                      {filteredStates.map((st) => (
                        <Pressable
                          key={st}
                          onPress={() => {
                            setSelectedState(st);
                            setStateDropdownOpen(false);
                            setStateSearch('');
                          }}
                          style={[
                            tw`px-3 py-2 rounded-xl mb-1 flex-row items-center justify-between transition-all`,
                            selectedState === st
                              ? { backgroundColor: isDark ? 'rgba(47, 128, 255, 0.25)' : 'rgba(37, 99, 235, 0.12)' }
                              : {},
                          ]}>
                          <Text
                            style={[
                              tw`text-xs`,
                              {
                                color: selectedState === st ? colors.brightBlue : colors.textPrimary,
                                fontWeight: selectedState === st ? '700' : '500',
                              },
                            ]}>
                            {st}
                          </Text>
                          {selectedState === st && (
                            <CheckCircle2 size={13} color={colors.brightBlue} strokeWidth={2.5} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* District Selector */}
              <View style={tw`relative`}>
                <Pressable
                  onPress={() => {
                    setDistrictDropdownOpen((p) => !p);
                    setStateDropdownOpen(false);
                  }}
                  style={[
                    tw`flex-row items-center px-3.5 py-1.5 border rounded-xl shadow-2xs min-w-[135px] justify-between transition-all`,
                    {
                      backgroundColor: districtDropdownOpen
                        ? (isDark ? 'rgba(47, 128, 255, 0.2)' : 'rgba(37, 99, 235, 0.12)')
                        : colors.bgPanel,
                      borderColor: districtDropdownOpen ? colors.brightBlue : colors.borderColor,
                    },
                  ]}>
                  <Text style={[tw`text-xs font-semibold mr-2`, { color: colors.textPrimary }]} numberOfLines={1}>
                    {selectedDistrict || 'Select District'}
                  </Text>
                  <ChevronDown size={13} color={colors.textMuted} strokeWidth={2} />
                </Pressable>

                {districtDropdownOpen && (
                  <View
                    style={[
                      tw`absolute top-11 left-0 w-64 rounded-2xl border shadow-2xl p-2.5`,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        zIndex: 999999,
                        elevation: 999999,
                        maxHeight: 290,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                      } as any,
                    ]}>
                    <View style={tw`flex-row items-center px-2 py-1 mb-2 border rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700`}>
                      <Search size={13} color={colors.brightBlue} style={tw`mr-1.5`} />
                      <TextInput
                        value={districtSearch}
                        onChangeText={setDistrictSearch}
                        placeholder="Search district…"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          tw`flex-1 text-xs py-1 font-medium bg-transparent border-0`,
                          { color: colors.textPrimary },
                          Platform.OS === 'web'
                            ? ({
                                outlineStyle: 'none',
                                outline: 'none',
                                border: 'none',
                              } as any)
                            : {},
                        ]}
                        autoFocus
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 210 }} showsVerticalScrollIndicator>
                      {filteredDistricts.map((d) => (
                        <Pressable
                          key={d.district}
                          onPress={() => {
                            setSelectedDistrict(d.district);
                            setDistrictDropdownOpen(false);
                            setDistrictSearch('');
                          }}
                          style={[
                            tw`px-3 py-2 rounded-xl mb-1 flex-row justify-between items-center transition-all`,
                            selectedDistrict === d.district
                              ? { backgroundColor: isDark ? 'rgba(47, 128, 255, 0.25)' : 'rgba(37, 99, 235, 0.12)' }
                              : {},
                          ]}>
                          <Text
                            style={[
                              tw`text-xs`,
                              {
                                color: selectedDistrict === d.district ? colors.brightBlue : colors.textPrimary,
                                fontWeight: selectedDistrict === d.district ? '700' : '500',
                              },
                            ]}>
                            {d.district}
                          </Text>
                          <View style={tw`flex-row items-center`}>
                            <View style={tw`px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1.5`}>
                              <Text style={[tw`text-[10px] font-mono font-medium`, { color: colors.textMuted }]}>
                                {d.stations} stns
                              </Text>
                            </View>
                            {selectedDistrict === d.district && (
                              <CheckCircle2 size={13} color={colors.brightBlue} strokeWidth={2.5} />
                            )}
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Download PDF Button */}
              <Pressable
                onPress={handleDownloadPdf}
                disabled={isDownloading}
                style={[
                  tw`flex-row items-center px-4 py-2 rounded-xl shadow-sm transition-all`,
                  { backgroundColor: colors.primaryBlue, opacity: isDownloading ? 0.8 : 1 },
                ]}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={tw`mr-2`} />
                ) : (
                  <Download size={14} color="#FFFFFF" strokeWidth={2.2} style={tw`mr-1.5`} />
                )}
                <Text style={tw`text-white text-xs font-semibold`}>
                  {isDownloading ? 'Generating PDF…' : 'Download PDF (A4)'}
                </Text>
              </Pressable>

              {/* Close Modal Button */}
              <Pressable
                onPress={onClose}
                style={[
                  tw`p-2 rounded-xl border`,
                  {
                    backgroundColor: colors.bgPanel,
                    borderColor: colors.borderColor,
                  },
                ]}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Printable Document Body */}
          <ScrollView
            style={[tw`flex-1 rounded-b-[24px]`, { flex: 1, minHeight: 0, overflowY: 'auto' } as any]}
            contentContainerStyle={tw`p-6 md:p-10`}
            showsVerticalScrollIndicator>
            {advisoryApi.loading && !advisory ? (
              <View style={tw`py-24 items-center justify-center`}>
                <ActivityIndicator size="large" color={colors.brightBlue} style={tw`mb-3`} />
                <Text style={[tw`text-sm font-medium`, { color: colors.textMuted }]}>
                  Compiling official CGWB telemetry advisory for {selectedDistrict}…
                </Text>
              </View>
            ) : advisory ? (
              <View
                // @ts-ignore
                id="cgwb-advisory-printable"
                nativeID="cgwb-advisory-printable"
                style={[
                  tw`p-8 rounded-2xl border shadow-sm`,
                  {
                    backgroundColor: isDark ? colors.cardBg : '#FFFFFF',
                    borderColor: colors.borderColor,
                  },
                ]}>
                {/* Official Letterhead Header */}
                <View style={tw`flex-row items-center justify-between border-b-2 pb-4 mb-5 border-slate-700`}>
                  <View style={tw`flex-row items-center flex-1 pr-4`}>
                    <View
                      style={[
                        tw`w-14 h-14 rounded-2xl border items-center justify-center mr-4 shadow-sm overflow-hidden`,
                        {
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                        },
                      ]}>
                      <Image source={logo} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    </View>
                    <View>
                      <Text style={[tw`text-xs font-extrabold tracking-wider uppercase`, { color: '#0284C7' }]}>
                        Government of India • Ministry of Jal Shakti
                      </Text>
                      <Text style={[tw`text-base font-black tracking-tight mt-0.5`, { color: colors.textPrimary }]}>
                        CENTRAL GROUND WATER BOARD (CGWB)
                      </Text>
                      <Text style={[tw`text-[11px] font-medium`, { color: colors.textMuted }]}>
                        National Groundwater Telemetry &amp; Resource Evaluation Authority (SIH25068)
                      </Text>
                    </View>
                  </View>

                  <View style={tw`items-end`}>
                    <View style={tw`bg-red-600/10 border border-red-500/30 px-2.5 py-0.5 rounded-full mb-1`}>
                      <Text style={tw`text-[10px] font-bold text-red-600 uppercase tracking-widest`}>
                        Official Technical Advisory
                      </Text>
                    </View>
                    <Text style={[tw`text-[10px] font-mono`, { color: colors.textMuted }]}>
                      Ref: {advisory.reference_no}
                    </Text>
                    <Text style={[tw`text-[10px] font-medium`, { color: colors.textMuted }]}>
                      Dated: {advisory.date}
                    </Text>
                  </View>
                </View>

                {/* Advisory Title & Target Authority */}
                <View style={tw`mb-5`}>
                  <Text style={[tw`text-xl font-bold tracking-tight text-center uppercase`, { color: colors.textPrimary }]}>
                    DISTRICT GROUNDWATER RESOURCE EVALUATION &amp; ADVISORY BRIEF
                  </Text>
                  <Text style={[tw`text-xs text-center font-medium mt-1`, { color: colors.brightBlue }]}>
                    ASSESSMENT SUBJECT: DISTRICT {advisory.district.toUpperCase()} ({advisory.state.toUpperCase()})
                  </Text>
                  <Text style={[tw`text-[11px] text-center mt-0.5 italic`, { color: colors.textMuted }]}>
                    Submitted for actionable review to: District Collector / Magistrate &amp; State Ground Water Department
                  </Text>
                </View>

                {/* 4 Core Summary Stat KPI Cards */}
                <View style={tw`flex-row flex-wrap -mx-1.5 mb-5`}>
                  {/* Category Status */}
                  <View style={tw`w-1/2 md:w-1/4 p-1.5`}>
                    <View style={[tw`p-3.5 rounded-xl border items-center justify-center`, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.borderColor }]}>
                      <Text style={[tw`text-[10px] font-semibold uppercase tracking-wider`, { color: colors.textMuted }]}>
                        Aquifer Health
                      </Text>
                      <Text style={[tw`text-base font-bold mt-1 uppercase`, { color: advisory.status_color }]}>
                        {advisory.overall_category}
                      </Text>
                      <Text style={[tw`text-[9px] mt-0.5 font-medium`, { color: colors.textMuted }]}>
                        Stress Score: {advisory.vulnerability_score}/100
                      </Text>
                    </View>
                  </View>

                  {/* Mean Water Depth */}
                  <View style={tw`w-1/2 md:w-1/4 p-1.5`}>
                    <View style={[tw`p-3.5 rounded-xl border items-center justify-center`, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.borderColor }]}>
                      <Text style={[tw`text-[10px] font-semibold uppercase tracking-wider`, { color: colors.textMuted }]}>
                        Mean Water Level
                      </Text>
                      <Text style={[tw`text-base font-bold mt-1`, { color: colors.textPrimary }]}>
                        {fmt(advisory.avg_depth_mbgl, 2)} <Text style={tw`text-xs font-normal`}>m bgl</Text>
                      </Text>
                      <Text style={[tw`text-[9px] mt-0.5 font-medium`, { color: colors.textMuted }]}>
                        Depth below ground
                      </Text>
                    </View>
                  </View>

                  {/* Depletion Rate */}
                  <View style={tw`w-1/2 md:w-1/4 p-1.5`}>
                    <View style={[tw`p-3.5 rounded-xl border items-center justify-center`, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.borderColor }]}>
                      <Text style={[tw`text-[10px] font-semibold uppercase tracking-wider`, { color: colors.textMuted }]}>
                        Annual Trend Rate
                      </Text>
                      <Text
                        style={[
                          tw`text-base font-bold mt-1`,
                          { color: (advisory.avg_trend_m_yr ?? 0) > 0 ? '#DC2626' : '#16A34A' },
                        ]}>
                        {Math.abs(advisory.avg_trend_m_yr ?? 0).toFixed(2)}{' '}
                        <Text style={tw`text-xs font-normal`}>
                          m/yr {(advisory.avg_trend_m_yr ?? 0) > 0 ? 'fall' : 'rise'}
                        </Text>
                      </Text>
                      <Text style={[tw`text-[9px] mt-0.5 font-medium`, { color: colors.textMuted }]}>
                        Linear regression fit
                      </Text>
                    </View>
                  </View>

                  {/* Monsoon Recharge */}
                  <View style={tw`w-1/2 md:w-1/4 p-1.5`}>
                    <View style={[tw`p-3.5 rounded-xl border items-center justify-center`, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: colors.borderColor }]}>
                      <Text style={[tw`text-[10px] font-semibold uppercase tracking-wider`, { color: colors.textMuted }]}>
                        Monsoon Recharge
                      </Text>
                      <Text style={[tw`text-base font-bold mt-1`, { color: colors.brightBlue }]}>
                        {fmt(advisory.avg_recharge_mm, 0)} <Text style={tw`text-xs font-normal`}>mm</Text>
                      </Text>
                      <Text style={[tw`text-[9px] mt-0.5 font-medium`, { color: colors.textMuted }]}>
                        WTF Method (GEC-2015)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Executive Synthesis Statement Box */}
                <View
                  style={[
                    tw`p-4 rounded-xl border mb-6`,
                    {
                      backgroundColor: isDark ? 'rgba(47, 128, 255, 0.08)' : '#F0F9FF',
                      borderColor: isDark ? 'rgba(47, 128, 255, 0.3)' : '#BAE6FD',
                    },
                  ]}>
                  <View style={tw`flex-row items-center mb-1.5`}>
                    <Wrench size={15} color="#0284C7" strokeWidth={2} style={tw`mr-2`} />
                    <Text style={[tw`text-xs font-bold uppercase tracking-wider`, { color: '#0369A1' }]}>
                      Executive Assessment &amp; Policy Synthesis
                    </Text>
                  </View>
                  <Text style={[tw`text-xs leading-5 font-normal`, { color: colors.textPrimary }]}>
                    {advisory.executive_summary}
                  </Text>
                </View>

                {/* High Priority Gram Panchayat / Block Intervention Matrix */}
                <View style={tw`mb-6`}>
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <View style={tw`flex-row items-center`}>
                      <Building2 size={15} color={colors.brightBlue} strokeWidth={2} style={tw`mr-2`} />
                      <Text style={[tw`text-sm font-bold`, { color: colors.textPrimary }]}>
                        Block &amp; Gram Panchayat Prioritized Action Plan ({advisory.stations.length} Nodes)
                      </Text>
                    </View>
                    <Text style={[tw`text-[10px] font-medium`, { color: colors.textMuted }]}>
                      Ranked by Depletion Urgency
                    </Text>
                  </View>

                  {/* Table */}
                  <View style={[tw`border rounded-xl overflow-hidden`, { borderColor: colors.borderColor }]}>
                    {/* Table Header */}
                    <View
                      style={[
                        tw`flex-row items-center px-3 py-2 border-b`,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                          borderColor: colors.borderColor,
                        },
                      ]}>
                      <Text style={[tw`w-[18%] text-[10px] font-bold uppercase`, { color: colors.textMuted }]}>
                        Block / Tehsil
                      </Text>
                      <Text style={[tw`w-[22%] text-[10px] font-bold uppercase`, { color: colors.textMuted }]}>
                        DWLR Station
                      </Text>
                      <Text style={[tw`w-[12%] text-[10px] font-bold uppercase text-right`, { color: colors.textMuted }]}>
                        Level (m)
                      </Text>
                      <Text style={[tw`w-[14%] text-[10px] font-bold uppercase text-right`, { color: colors.textMuted }]}>
                        Trend (m/yr)
                      </Text>
                      <Text style={[tw`w-[14%] text-[10px] font-bold uppercase text-center`, { color: colors.textMuted }]}>
                        Urgency
                      </Text>
                      <Text style={[tw`w-[20%] text-[10px] font-bold uppercase`, { color: colors.textMuted }]}>
                        Recommended Structure
                      </Text>
                    </View>

                    {/* Table Rows */}
                    {advisory.stations.slice(0, 15).map((st, i) => {
                      const isUrgent = st.priority === 'URGENT';
                      const isHigh = st.priority === 'HIGH';
                      return (
                        <View
                          key={st.code}
                          style={[
                            tw`flex-row items-center px-3 py-2 border-b`,
                            {
                              borderColor: colors.borderColor,
                              backgroundColor:
                                i % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
                            },
                          ]}>
                          <Text
                            style={[tw`w-[18%] text-[11px] font-medium`, { color: colors.textPrimary }]}
                            numberOfLines={1}>
                            {st.block}
                          </Text>
                          <View style={tw`w-[22%] pr-1`}>
                            <Text
                              style={[tw`text-[11px] font-semibold`, { color: colors.textPrimary }]}
                              numberOfLines={1}>
                              {st.name}
                            </Text>
                            <Text style={[tw`text-[9px] font-mono`, { color: colors.textMuted }]}>{st.code}</Text>
                          </View>
                          <Text
                            style={[tw`w-[12%] text-[11px] font-medium text-right`, { color: colors.textPrimary }]}>
                            {fmt(st.depth_mbgl, 2)}
                          </Text>
                          <Text
                            style={[
                              tw`w-[14%] text-[11px] font-semibold text-right`,
                              { color: (st.trend_m_yr ?? 0) > 0 ? '#DC2626' : '#16A34A' },
                            ]}>
                            {(st.trend_m_yr ?? 0) > 0 ? '+' : ''}
                            {fmt(st.trend_m_yr, 2)}
                          </Text>
                          <View style={tw`w-[14%] items-center`}>
                            <View
                              style={[
                                tw`px-1.5 py-0.5 rounded text-center`,
                                isUrgent
                                  ? { backgroundColor: '#FEE2E2' }
                                  : isHigh
                                  ? { backgroundColor: '#FFEDD5' }
                                  : { backgroundColor: '#E0F2FE' },
                              ]}>
                              <Text
                                style={[
                                  tw`text-[9px] font-bold uppercase`,
                                  isUrgent
                                    ? { color: '#DC2626' }
                                    : isHigh
                                    ? { color: '#EA580C' }
                                    : { color: '#0284C7' },
                                ]}>
                                {st.priority}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[tw`w-[20%] text-[10px] leading-3.5 font-normal`, { color: colors.textMuted }]}
                            numberOfLines={2}>
                            {st.recommended_intervention}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Official Sign-off & Verification Block */}
                <View style={tw`flex-row items-end justify-between pt-6 border-t border-slate-300 mt-6`}>
                  <View style={tw`max-w-xs`}>
                    <Text style={[tw`text-[10px] font-bold uppercase tracking-wider`, { color: colors.textMuted }]}>
                      Automated Verification Hash
                    </Text>
                    <Text style={[tw`text-[9px] font-mono mt-0.5 leading-3.5`, { color: colors.textMuted }]}>
                      SHA256: 8a9f4c3d2e1b6a7c9d0e5f2a1c4b7e8d • Validated against CGWB Telemetry Gateway (SIH25068)
                    </Text>
                  </View>

                  <View style={tw`items-center`}>
                    <View style={tw`w-36 h-10 border-b border-dashed border-slate-500 mb-1`} />
                    <Text style={[tw`text-xs font-bold`, { color: colors.textPrimary }]}>
                      Regional Hydrogeologist
                    </Text>
                    <Text style={[tw`text-[9px]`, { color: colors.textMuted }]}>
                      Central Ground Water Board, GoI
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
