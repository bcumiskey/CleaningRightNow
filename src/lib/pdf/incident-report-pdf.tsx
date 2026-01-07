import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
    paddingBottom: 15,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#6b7280',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
  },
  value: {
    flex: 1,
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  severityHigh: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  severityMedium: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  severityLow: {
    backgroundColor: '#d1fae5',
    color: '#059669',
  },
  typeDamage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  typeIssue: {
    backgroundColor: '#ffedd5',
    color: '#ea580c',
  },
  description: {
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 6,
    marginTop: 10,
    lineHeight: 1.5,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photo: {
    width: 180,
    height: 135,
    objectFit: 'cover',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoCaption: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 4,
    maxWidth: 180,
  },
  cost: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  disclaimer: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 20,
    fontStyle: 'italic',
  },
})

interface IncidentReportProps {
  incident: {
    type: string
    title?: string
    content: string
    severity?: string
    estimatedCost?: number
    createdAt: string | Date
    addedBy: { name: string }
    photos: Array<{
      url: string
      caption?: string
    }>
  }
  property: {
    name: string
    address: string
    ownerName: string
    ownerEmail?: string
  }
  company: {
    companyName: string
    address?: string
    phone?: string
    email?: string
    logoUrl?: string
  }
}

const IncidentReportPDF: React.FC<IncidentReportProps> = ({ incident, property, company }) => {
  const reportDate = format(new Date(), 'MMMM d, yyyy')
  const incidentDate = format(new Date(incident.createdAt), 'MMMM d, yyyy \'at\' h:mm a')

  const getSeverityStyle = (severity?: string) => {
    switch (severity) {
      case 'high':
        return styles.severityHigh
      case 'medium':
        return styles.severityMedium
      case 'low':
        return styles.severityLow
      default:
        return {}
    }
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'damage':
        return styles.typeDamage
      case 'issue':
        return styles.typeIssue
      default:
        return {}
    }
  }

  const typeLabel = incident.type.charAt(0).toUpperCase() + incident.type.slice(1).replace('_', ' ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.companyName}</Text>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.companyName}</Text>
            {company.address && <Text>{company.address}</Text>}
            {company.phone && <Text>{company.phone}</Text>}
            {company.email && <Text>{company.email}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Incident Report</Text>
        <Text style={styles.subtitle}>Report Date: {reportDate}</Text>

        {/* Property Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Property:</Text>
            <Text style={styles.value}>{property.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{property.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Owner:</Text>
            <Text style={styles.value}>{property.ownerName}</Text>
          </View>
          {property.ownerEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Owner Email:</Text>
              <Text style={styles.value}>{property.ownerEmail}</Text>
            </View>
          )}
        </View>

        {/* Incident Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incident Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Type:</Text>
            <View style={[styles.badge, getTypeStyle(incident.type)]}>
              <Text>{typeLabel}</Text>
            </View>
          </View>
          {incident.severity && (
            <View style={styles.row}>
              <Text style={styles.label}>Severity:</Text>
              <View style={[styles.badge, getSeverityStyle(incident.severity)]}>
                <Text>{incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}</Text>
              </View>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Reported:</Text>
            <Text style={styles.value}>{incidentDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reported By:</Text>
            <Text style={styles.value}>{incident.addedBy.name}</Text>
          </View>
          {incident.estimatedCost && (
            <View style={styles.row}>
              <Text style={styles.label}>Estimated Cost:</Text>
              <Text style={styles.cost}>${incident.estimatedCost.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {incident.title || 'Description'}
          </Text>
          <View style={styles.description}>
            <Text>{incident.content}</Text>
          </View>
        </View>

        {/* Photos */}
        {incident.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photo Evidence ({incident.photos.length} photo{incident.photos.length !== 1 ? 's' : ''})</Text>
            <View style={styles.photosGrid}>
              {incident.photos.map((photo, index) => (
                <View key={index}>
                  <Image src={photo.url} style={styles.photo} />
                  {photo.caption && (
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          This report documents an incident observed during routine property maintenance.
          Photo evidence has been provided where available. Please contact us if you require
          additional information or would like to discuss resolution options.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by {company.companyName} • {reportDate}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default IncidentReportPDF
