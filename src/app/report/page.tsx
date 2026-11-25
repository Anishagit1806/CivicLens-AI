'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  LocateFixed,
  Sparkles,
  Upload,
} from 'lucide-react';
import { InteractiveMap } from '@/components/civic/InteractiveMap';
import { useApp } from '@/components/providers/AppProvider';
import { AIProviderBadge, SeverityBadge } from '@/components/ui/Badges';
import { compressImageFile } from '@/lib/utils/image-compress';
import {
  ISSUE_CATEGORIES,
  type AITriageResult,
  type DuplicateMatch,
  type IssueCategory,
  type PriorityBreakdown,
} from '@/types/civic';

interface AnalyzePreview {
  triage: AITriageResult;
  priority: { priorityScore: number; breakdown: PriorityBreakdown };
  duplicates: DuplicateMatch[];
}

export default function ReportIssuePage() {
  const router = useRouter();
  const { t, user, pushToast } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IssueCategory>('potholes');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [wardOrZone, setWardOrZone] = useState('Ward 114 - Teynampet');
  const [latitude, setLatitude] = useState(13.0604);
  const [longitude, setLongitude] = useState(80.2496);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState('');

  const [preview, setPreview] = useState<AnalyzePreview | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Only JPEG, PNG, and WebP images are permitted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file must be 5 MB or smaller.');
      return;
    }

    setErrorMessage(null);
    const compressed = await compressImageFile(file);
    setImageFile(compressed);
    setImagePreviewUrl(URL.createObjectURL(compressed));
    if (!imageAlt.trim()) {
      setImageAlt(`Evidence photograph for ${title || 'civic issue'}`);
    }
  }

  function handleUseGps() {
    if (!navigator.geolocation) {
      pushToast('error', 'Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Math.round(pos.coords.latitude * 100000) / 100000);
        setLongitude(Math.round(pos.coords.longitude * 100000) / 100000);
        pushToast('success', 'Coordinates updated from browser GPS.');
      },
      () => {
        pushToast('error', 'Unable to retrieve GPS coordinates. Please pick on map.');
      },
      { timeout: 8000 }
    );
  }

  async function handlePreviewAi() {
    setErrorMessage(null);
    if (title.trim().length < 5 || description.trim().length < 15) {
      setErrorMessage(
        'Enter at least 5 characters for title and 15 characters for description before running AI triage preview.'
      );
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          selectedCategory: category,
          locationText,
          latitude,
          longitude,
        }),
      });
      const json = (await res.json()) as { data?: AnalyzePreview; error?: string };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'AI analysis preview failed.');
      }
      setPreview(json.data);
      pushToast('success', 'AI triage and duplicate check complete.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to preview AI triage.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Please sign in or register before submitting an official report.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('locationText', locationText);
      formData.append('wardOrZone', wardOrZone);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      if (imageAlt.trim()) {
        formData.append('imageAlt', imageAlt.trim());
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch('/api/issues', {
        method: 'POST',
        body: formData,
      });

      const json = (await res.json()) as {
        data?: { issue: { id: string; referenceCode: string } };
        error?: string;
      };

      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Unable to submit civic issue report.');
      }

      pushToast(
        'success',
        `Report ${json.data.issue.referenceCode} submitted and prioritized!`
      );
      router.push(`/issues/${json.data.issue.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {t.reportForm.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t.reportForm.subheading}</p>
      </div>

      {!user ? (
        <div
          role="region"
          aria-label="Sign in required notice"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"
        >
          <div>
            <p className="font-bold">Sign in required to submit official reports</p>
            <p className="mt-0.5 text-xs">
              Authenticated reporting prevents spam and enables real-time status notifications.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-[#0b4f6c] px-4 py-2 text-xs font-bold text-white hover:bg-[#093e55]"
            >
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100"
            >
              {t.nav.register}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2"
          noValidate
        >
          {errorMessage ? (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="issue-title"
                className="block text-sm font-semibold text-slate-900"
              >
                {t.reportForm.titleLabel} <span className="text-red-700">*</span>
              </label>
              <input
                id="issue-title"
                name="title"
                type="text"
                required
                minLength={5}
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.reportForm.titlePlaceholder}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="issue-category"
                className="block text-sm font-semibold text-slate-900"
              >
                {t.reportForm.categoryLabel} <span className="text-red-700">*</span>
              </label>
              <select
                id="issue-category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t.categories[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="issue-ward"
                className="block text-sm font-semibold text-slate-900"
              >
                {t.reportForm.wardLabel} <span className="text-red-700">*</span>
              </label>
              <input
                id="issue-ward"
                name="wardOrZone"
                type="text"
                required
                value={wardOrZone}
                onChange={(e) => setWardOrZone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="issue-description"
              className="block text-sm font-semibold text-slate-900"
            >
              {t.reportForm.descriptionLabel} <span className="text-red-700">*</span>
            </label>
            <textarea
              id="issue-description"
              name="description"
              required
              minLength={15}
              maxLength={2500}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.reportForm.descriptionPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="issue-location"
              className="block text-sm font-semibold text-slate-900"
            >
              {t.reportForm.locationLabel} <span className="text-red-700">*</span>
            </label>
            <input
              id="issue-location"
              name="locationText"
              type="text"
              required
              minLength={3}
              maxLength={240}
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder={t.reportForm.locationPlaceholder}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div className="grid items-end gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="issue-lat"
                className="block text-sm font-semibold text-slate-900"
              >
                {t.reportForm.latitudeLabel}
              </label>
              <input
                id="issue-lat"
                name="latitude"
                type="number"
                step="0.00001"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="issue-lng"
                className="block text-sm font-semibold text-slate-900"
              >
                {t.reportForm.longitudeLabel}
              </label>
              <input
                id="issue-lng"
                name="longitude"
                type="number"
                step="0.00001"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
            >
              <LocateFixed className="h-4 w-4 text-[#0b4f6c]" aria-hidden="true" />
              <span>{t.reportForm.useCurrentLocation}</span>
            </button>
          </div>

          {/* Evidence Photo Upload */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label
              htmlFor="issue-photo"
              className="flex items-center gap-2 text-sm font-semibold text-slate-900"
            >
              <Upload className="h-4 w-4 text-[#0b4f6c]" aria-hidden="true" />
              <span>{t.reportForm.photoLabel}</span>
            </label>
            <p className="mt-1 text-xs text-slate-600">{t.reportForm.photoHint}</p>
            <input
              id="issue-photo"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleFileChange(e)}
              className="mt-2 block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0b4f6c] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#093e55]"
            />

            {imagePreviewUrl ? (
              <div className="mt-3 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt={imageAlt || 'Preview of uploaded civic issue evidence'}
                  className="max-h-44 rounded-lg border border-slate-300 object-cover"
                />
                <div>
                  <label
                    htmlFor="issue-image-alt"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    {t.reportForm.photoAltLabel}
                  </label>
                  <input
                    id="issue-image-alt"
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder={t.reportForm.photoAltPlaceholder}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={!user || analyzing}
              onClick={() => void handlePreviewAi()}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0b4f6c] bg-white px-4 py-2.5 text-sm font-bold text-[#0b4f6c] hover:bg-sky-50 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{analyzing ? 'Analyzing...' : t.reportForm.previewAiButton}</span>
            </button>

            <button
              type="submit"
              disabled={!user || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f6c] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#093e55] disabled:opacity-50"
            >
              <span>{submitting ? t.reportForm.submitting : t.reportForm.submitButton}</span>
            </button>
          </div>
        </form>

        {/* Right Sidebar: AI Triage Preview + Duplicate Warning */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />
              <h2 className="text-base font-bold text-slate-900">
                AI Triage & Priority Preview
              </h2>
            </div>

            {preview ? (
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <AIProviderBadge provider={preview.triage.provider} />
                  <span className="font-bold text-[#0b4f6c]">
                    {t.common.priorityScore}: {preview.priority.priorityScore}/100
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={preview.triage.severity} />
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                    {t.categories[preview.triage.predictedCategory]} (
                    {Math.round(preview.triage.confidence * 100)}%)
                  </span>
                </div>

                <p className="leading-relaxed text-slate-700">
                  {preview.triage.severityExplanation}
                </p>

                <div className="rounded-lg bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700">
                  {preview.priority.breakdown.formulaSummary}
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    {t.detail.recommendationsHeading}
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-700">
                    {preview.triage.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </div>

                <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                  {preview.triage.limitationsNote}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Fill in the issue title and description, then select{' '}
                <strong>{t.reportForm.previewAiButton}</strong> to inspect AI category
                prediction, severity reasoning, transparent priority score, and nearby
                duplicates before submitting.
              </p>
            )}
          </div>

          {preview && preview.duplicates.length > 0 ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-xs text-amber-950"
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-800" aria-hidden="true" />
                <span>{t.reportForm.duplicateWarningTitle}</span>
              </div>
              <p className="mt-1">{t.reportForm.duplicateWarningBody}</p>
              <ul className="mt-3 space-y-2">
                {preview.duplicates.map((dup) => (
                  <li
                    key={dup.issueId}
                    className="rounded-lg border border-amber-200 bg-white p-2.5"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{dup.referenceCode}</span>
                      <span>
                        {Math.round(dup.combinedSimilarity * 100)}% match ·{' '}
                        {dup.distanceMeters}m away
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-800">{dup.title}</p>
                    <Link
                      href={`/issues/${dup.issueId}`}
                      className="mt-1 inline-block font-bold text-[#0b4f6c] underline"
                    >
                      Open existing report &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Coordinate Picker Map */}
      <section aria-label="Pin exact location on map" className="space-y-2">
        <h2 className="text-lg font-bold text-slate-900">
          Pin Exact Coordinates on Map
        </h2>
        <InteractiveMap
          issues={[]}
          heightClass="h-[320px]"
          selectableCoords={{ latitude, longitude }}
          onSelectCoords={({ latitude: lat, longitude: lng }) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
      </section>
    </div>
  );
}
