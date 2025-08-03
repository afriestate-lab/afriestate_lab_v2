import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform
} from 'react-native'
import {
  Text,
  Button,
  Surface,
  IconButton,
  useTheme
} from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

interface DatePickerProps {
  visible: boolean
  onClose: () => void
  onDateSelect: (date: string) => void
  title: string
  minDate?: string
  maxDate?: string
}

export default function DatePicker({
  visible,
  onClose,
  onDateSelect,
  title,
  minDate,
  maxDate
}: DatePickerProps) {
  const theme = useTheme()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())

  const months = [
    'Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicuransi', 'Kamena',
    'Nyakanga', 'Kanama', 'Nzeli', 'Ukwakira', 'Ugushyingo', 'Ukuboza'
  ]

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getDaysArray = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month)
    const days = []
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth, selectedDay)
    const dateString = date.toISOString().split('T')[0]
    onDateSelect(dateString)
    onClose()
  }

  const isDateDisabled = (day: number) => {
    const date = new Date(selectedYear, selectedMonth, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (minDate) {
      const minDateObj = new Date(minDate)
      if (date < minDateObj) return true
    }

    if (maxDate) {
      const maxDateObj = new Date(maxDate)
      if (date > maxDateObj) return true
    }

    return date < today
  }

  const renderYearSelector = () => (
    <View style={styles.yearSelector}>
      <IconButton
        icon="chevron-left"
        onPress={() => setSelectedYear(prev => prev - 1)}
        size={24}
      />
      <Text style={styles.yearText}>{selectedYear}</Text>
      <IconButton
        icon="chevron-right"
        onPress={() => setSelectedYear(prev => prev + 1)}
        size={24}
      />
    </View>
  )

  const renderMonthSelector = () => (
    <View style={styles.monthSelector}>
      <IconButton
        icon="chevron-left"
        onPress={() => {
          if (selectedMonth === 0) {
            setSelectedMonth(11)
            setSelectedYear(prev => prev - 1)
          } else {
            setSelectedMonth(prev => prev - 1)
          }
        }}
        size={24}
      />
      <Text style={styles.monthText}>{months[selectedMonth]}</Text>
      <IconButton
        icon="chevron-right"
        onPress={() => {
          if (selectedMonth === 11) {
            setSelectedMonth(0)
            setSelectedYear(prev => prev + 1)
          } else {
            setSelectedMonth(prev => prev + 1)
          }
        }}
        size={24}
      />
    </View>
  )

  const renderDaysGrid = () => {
    const days = getDaysArray(selectedYear, selectedMonth)
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay()
    const emptyCells = Array(firstDayOfMonth).fill(null)

    return (
      <View style={styles.daysGrid}>
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.dayHeader}>
              {day}
            </Text>
          ))}
        </View>

        {/* Days */}
        <View style={styles.daysContainer}>
          {emptyCells.map((_, index) => (
            <View key={`empty-${index}`} style={styles.emptyDay} />
          ))}
          
          {days.map((day) => {
            const isSelected = day === selectedDay
            const isDisabled = isDateDisabled(day)
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDay,
                  isDisabled && styles.disabledDay
                ]}
                onPress={() => !isDisabled && setSelectedDay(day)}
                disabled={isDisabled}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  isDisabled && styles.disabledDayText
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#3498db', '#2980b9']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <IconButton
              icon="close"
              iconColor="white"
              size={24}
              onPress={onClose}
            />
            <Text variant="titleLarge" style={styles.headerTitle}>
              {title}
            </Text>
            <View style={{ width: 48 }} />
          </View>
        </LinearGradient>

        {/* Date Picker Content */}
        <View style={styles.content}>
          {renderYearSelector()}
          {renderMonthSelector()}
          {renderDaysGrid()}

          {/* Confirm Button */}
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.confirmButton}
            contentStyle={styles.buttonContent}
          >
            Emeza
          </Button>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#3498db'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fbfe'
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50'
  },
  daysGrid: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 15
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d'
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  emptyDay: {
    width: '14.28%',
    height: 45
  },
  dayButton: {
    width: '14.28%',
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22.5,
    marginVertical: 2
  },
  selectedDay: {
    backgroundColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4
  },
  disabledDay: {
    opacity: 0.3
  },
  dayText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500'
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold'
  },
  disabledDayText: {
    color: '#bdc3c7'
  },
  confirmButton: {
    marginTop: 30,
    backgroundColor: '#3498db',
    borderRadius: 12,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  buttonContent: {
    height: 48
  }
}) 