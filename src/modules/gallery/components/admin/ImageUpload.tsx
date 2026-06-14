import { useState, useEffect } from 'react'
import { Upload, X, MapPin, Anchor, Briefcase, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { ImageDropzone } from '@/components/ui/file-upload'
import { portService, Port, type PortArea } from '@/modules/logistics/services/portService'
import { serviceTypeService, ServiceType } from '@/modules/service-types/services/serviceTypeService'
import { commodityService, Commodity, CommodityImageCount } from '@/modules/gallery/services/commodityService'
import { galleryService } from '@/modules/gallery/services/galleryService'
import { useGalleryManageFilters } from './galleryManageContext'

const AREA_OPTIONS: PortArea[] = ['NORTHERN', 'MIDDLE', 'SOUTHERN']

export interface AddImageTabProps {
  /** When true, omits page-level chrome (used inside GalleryImageHub). */
  embedded?: boolean
  /** Called after at least one file uploaded successfully. */
  onUploadSuccess?: () => void
}

function AddImageUploadPanel({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void
}) {
  const {
    filterArea: selectedArea,
    filterPort: selectedPort,
    filterServiceType: selectedServiceType,
    filterCommodity: selectedCommodity,
    filterProvinceId: selectedProvinceId,
    availableCommodities,
    commodityCounts,
  } = useGalleryManageFilters()

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  // Bumped after a successful upload to remount (reset) the dropzone.
  const [resetKey, setResetKey] = useState(0)

  const commodityMeta = selectedCommodity
    ? availableCommodities.find((type) => type.id === selectedCommodity)
    : null
  const countKey =
    selectedCommodity && selectedProvinceId && selectedPort && selectedServiceType
      ? `${selectedProvinceId}_${selectedPort}_${selectedServiceType}_${selectedCommodity}`
      : null
  const currentCount = countKey ? (commodityCounts[countKey] ?? 0) : 0
  const requiredCount = commodityMeta?.requiredImageCount ?? 0

  const handleUpload = async () => {
    if (
      !selectedProvinceId ||
      !selectedPort ||
      !selectedServiceType ||
      !selectedCommodity ||
      selectedFiles.length === 0
    ) {
      alert('Please complete all filters on the left and select files')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const file of selectedFiles) {
      try {
        await galleryService.uploadImage(
          file,
          selectedProvinceId,
          selectedPort,
          selectedServiceType,
          selectedCommodity,
        )
        successCount++
      } catch (error: unknown) {
        failedCount++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${file.name}: ${errorMsg}`)
        console.error('Error uploading file:', file.name, error)
      }
    }

    setIsUploading(false)
    setUploadResult({ success: successCount, failed: failedCount, errors })

    if (successCount > 0) {
      onUploadSuccess?.()
    }

    setSelectedFiles([])
    setResetKey((k) => k + 1)
    setTimeout(() => setUploadResult(null), 8000)
  }

  const canUpload =
    selectedArea &&
    selectedPort &&
    selectedServiceType &&
    selectedCommodity &&
    selectedFiles.length > 0

  return (
    <div className="space-y-6">
      {uploadResult && (
        <UploadResultBanner result={uploadResult} onDismiss={() => setUploadResult(null)} />
      )}

      {selectedCommodity && commodityMeta && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 ${
            currentCount >= requiredCount
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            {currentCount >= requiredCount
              ? `This type already has ${requiredCount} images. Additional uploads will exceed the limit.`
              : `${requiredCount - currentCount} more images needed to reach the required ${requiredCount}.`}
          </span>
        </div>
      )}

      <div>
        <label className="mb-2 flex items-center gap-2 font-semibold">
          <Upload className="h-4 w-4 text-primary" />
          Select files <span className="text-red-500">*</span>
        </label>

        <ImageDropzone
          key={resetKey}
          onFilesChange={setSelectedFiles}
          disabled={!selectedCommodity}
          maxFiles={20}
          maxFileSize={10 * 1024 * 1024}
          hint="PNG, JPG, WebP up to 10MB each"
        />

        {!selectedCommodity && (
          <p className="mt-2 text-sm text-muted-foreground">
            Complete area, port, service, and cargo filters on the left before choosing files.
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <Button
          onClick={handleUpload}
          disabled={!canUpload || isUploading}
          className="w-full cursor-pointer disabled:cursor-not-allowed"
          size="lg"
        >
          {isUploading ? (
            <>Uploading...</>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {selectedFiles.length > 0 && `${selectedFiles.length} File(s)`}
            </>
          )}
        </Button>
        {!canUpload && !isUploading && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Complete filters and select files to enable upload
          </p>
        )}
      </div>
    </div>
  )
}

function UploadResultBanner({
  result,
  onDismiss,
}: {
  result: { success: number; failed: number; errors: string[] }
  onDismiss: () => void
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        result.failed === 0 ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-semibold">
            Upload Complete: {result.success} uploaded, {result.failed} failed
          </p>
          {result.failed > 0 && result.errors.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="mb-1 font-medium">Errors:</p>
              <ul className="list-inside list-disc space-y-1">
                {result.errors.slice(0, 3).map((error, idx) => (
                  <li key={idx} className="text-red-700">
                    {error}
                  </li>
                ))}
                {result.errors.length > 3 && (
                  <li>...and {result.errors.length - 3} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer"
          aria-label="Close upload result"
          title="Close upload result"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function AddImageTab({ embedded = false, onUploadSuccess }: AddImageTabProps = {}) {
  if (embedded) {
    return <AddImageUploadPanel onUploadSuccess={onUploadSuccess} />
  }

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [selectedPort, setSelectedPort] = useState<number | null>(null)
  const [selectedServiceType, setSelectedServiceType] = useState<number | null>(null)
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const [availablePorts, setAvailablePorts] = useState<Port[]>([])
  const [availableCommodities, setAvailableCommodities] = useState<Commodity[]>([])
  const [commodityCounts, setCommodityCounts] = useState<Record<string, CommodityImageCount>>({})
  const selectedPortData = selectedPort ? availablePorts.find((port) => port.id === selectedPort) : null
  const selectedProvinceId = selectedPortData?.provinceId ?? null

  useEffect(() => {
    loadServiceTypes()
  }, [])

  // Fetch data only after area is selected, then reset dependent fields.
  useEffect(() => {
    if (!selectedArea) {
      setAvailablePorts([])
      setSelectedPort(null)
      setSelectedServiceType(null)
      setSelectedCommodity(null)
      return
    }

    const loadAreaData = async () => {
      try {
        setLoading(true)
        const portData = await portService.getPortsByArea(selectedArea)
        setAvailablePorts(portData)
      } catch (error) {
        console.error('Error loading ports for area:', error)
        setAvailablePorts([])
      } finally {
        setSelectedPort(null)
        setSelectedServiceType(null)
        setSelectedCommodity(null)
        setLoading(false)
      }
    }

    void loadAreaData()
  }, [selectedArea])

  // Reset dependent fields when service type changes
  useEffect(() => {
    if (selectedServiceType) {
      loadCommodities(selectedServiceType)
    } else {
      setAvailableCommodities([])
      setSelectedCommodity(null)
    }
  }, [selectedServiceType])

  // Load counts for all image types when all required fields are selected
  useEffect(() => {
    if (selectedProvinceId && selectedPort && selectedServiceType && availableCommodities.length > 0) {
      availableCommodities.forEach(type => {
        loadCommodityCount(type.id, selectedProvinceId, selectedPort, selectedServiceType)
      })
    }
  }, [selectedProvinceId, selectedPort, selectedServiceType, availableCommodities])

  // Load image count when image type is selected
  useEffect(() => {
    if (selectedCommodity && selectedProvinceId && selectedPort && selectedServiceType) {
      loadCommodityCount(selectedCommodity, selectedProvinceId, selectedPort, selectedServiceType)
    }
  }, [selectedCommodity, selectedProvinceId, selectedPort, selectedServiceType])

  const loadServiceTypes = async () => {
    try {
      const data = await serviceTypeService.getAllServiceTypes()
      setServiceTypes(data)
    } catch (error) {
      console.error('Error loading service types:', error)
    }
  }

  const loadCommodities = async (serviceTypeId: number) => {
    try {
      setLoading(true)
      const data = await commodityService.getCommoditiesByServiceType(serviceTypeId)
      setAvailableCommodities(data)
      setSelectedCommodity(null)
    } catch (error) {
      console.error('Error loading image types:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCommodityCount = async (commodityId: number, provinceId?: number, portId?: number, serviceTypeId?: number) => {
    try {
      const countData = await commodityService.getImageCount(commodityId, provinceId, portId, serviceTypeId)
      const key = `${provinceId || 0}_${portId || 0}_${serviceTypeId || 0}_${commodityId}`
      setCommodityCounts(prev => ({ ...prev, [key]: countData }))
    } catch (error) {
      console.error('Error loading image count:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles([...selectedFiles, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!selectedProvinceId || !selectedPort || !selectedServiceType || !selectedCommodity || selectedFiles.length === 0) {
      alert('Please complete all fields and select files')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Upload each file separately
    for (const file of selectedFiles) {
      try {
        await galleryService.uploadImage(
          file,
          selectedProvinceId,
          selectedPort,
          selectedServiceType,
          selectedCommodity
        )
        successCount++
      } catch (error: any) {
        failedCount++
        const errorMsg = error.message || 'Unknown error'
        errors.push(`${file.name}: ${errorMsg}`)
        console.error('Error uploading file:', file.name, error)
      }
    }

    setIsUploading(false)
    setUploadResult({ success: successCount, failed: failedCount, errors })

    if (successCount > 0) {
      onUploadSuccess?.()
    }

    // Reload all image type counts if successful
    if (successCount > 0 && selectedProvinceId && selectedPort && selectedServiceType) {
      availableCommodities.forEach(type => {
        loadCommodityCount(type.id, selectedProvinceId, selectedPort, selectedServiceType)
      })
    }

    // Clear files after upload
    setSelectedFiles([])

    // Auto-hide result after 8 seconds
    setTimeout(() => {
      setUploadResult(null)
    }, 8000)
  }

  const canUpload = selectedArea && selectedPort && selectedServiceType && selectedCommodity && selectedFiles.length > 0

  const key = selectedCommodity && selectedProvinceId && selectedPort && selectedServiceType 
    ? `${selectedProvinceId}_${selectedPort}_${selectedServiceType}_${selectedCommodity}`
    : null
  const selectedCommodityData = key ? commodityCounts[key] : null

  const formBody = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                1. Select Area <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                title="Select area"
                aria-label="Select area"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select Area --</option>
                {AREA_OPTIONS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              {!selectedArea && (
                <p className="text-sm text-muted-foreground mt-1">Please select an area first</p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <Anchor className="h-4 w-4 text-primary" />
                2. Select Port <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPort || ''}
                onChange={(e) => setSelectedPort(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedArea || loading}
                title="Select port"
                aria-label="Select port"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              >
                <option value="">
                  {loading ? 'Loading ports...' : '-- Select Port --'}
                </option>
                {availablePorts.map(port => (
                  <option key={port.id} value={port.id}>
                    {port.name} ({port.provinceName || 'Unknown Province'})
                  </option>
                ))}
              </select>
              {selectedArea && !loading && availablePorts.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">No ports found in this area.</p>
              )}
              {!selectedPort && availablePorts.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">Please select a port first</p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                3. Select Service Type <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedServiceType || ''}
                onChange={(e) => setSelectedServiceType(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedPort}
                title="Select service type"
                aria-label="Select service type"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              >
                <option value="">-- Select Service Type --</option>
                {serviceTypes.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
              {!selectedServiceType && (
                <p className="text-sm text-muted-foreground mt-1">Please select a service type first</p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                4. Select Cargo Type <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCommodity || ''}
                onChange={(e) => setSelectedCommodity(e.target.value ? Number(e.target.value) : null)}
                disabled={!selectedServiceType}
                title="Select cargo type"
                aria-label="Select cargo type"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
              >
                <option value="">-- Select Cargo Type --</option>
                {availableCommodities.map(type => {
                  const key = selectedProvinceId && selectedPort && selectedServiceType
                    ? `${selectedProvinceId}_${selectedPort}_${selectedServiceType}_${type.id}`
                    : null
                  const count = key ? commodityCounts[key] : null
                  const current = count ? count.current : 0
                  const required = count ? count.required : type.requiredImageCount
                  return (
                    <option key={type.id} value={type.id}>
                      {type.displayName} ({current}/{required} uploaded)
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {selectedCommodityData && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${
              selectedCommodityData.current >= selectedCommodityData.required
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}>
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {selectedCommodityData.current >= selectedCommodityData.required
                  ? `This type already has ${selectedCommodityData.required} images. Additional uploads will exceed the limit.`
                  : `${selectedCommodityData.required - selectedCommodityData.current} more images needed to reach the required ${selectedCommodityData.required}.`
                }
              </span>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              5. Select Files to Upload <span className="text-red-500">*</span>
            </label>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">Click to select files</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </label>
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!selectedCommodity}
              />
              <p className="text-sm text-muted-foreground mt-2">PNG, JPG, WebP up to 10MB each</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-semibold">{selectedFiles.length} file(s) selected:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        aria-label={`Remove ${file.name}`}
                        title={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleUpload}
              disabled={!canUpload || isUploading}
              className="w-full cursor-pointer disabled:cursor-not-allowed"
              size="lg"
            >
              {isUploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length > 0 && `${selectedFiles.length} File(s)`}
                </>
              )}
            </Button>
            {!canUpload && !isUploading && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Complete all fields and select files to enable upload
              </p>
            )}
          </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {uploadResult && (
        <UploadResultBanner result={uploadResult} onDismiss={() => setUploadResult(null)} />
      )}

      <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm shadow-primary/[0.04]">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Upload className="h-5 w-5 text-primary" strokeWidth={1.75} />
          Upload Images to Gallery
        </h2>
        <div className="space-y-6">{formBody}</div>
      </div>
    </div>
  )
}
