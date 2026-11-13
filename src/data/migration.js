export const checkLocalStorageForData = async () => {
  const budgetFromLocalStorage = localStorage.getItem('budget');
  if (budgetFromLocalStorage) {
    const announcedOldData = localStorage.getItem('announcedOldData');
    if (!announcedOldData) {
      alert(
        'Whoops! It looks like you had data in the old version of this app. Contact me if you want help restoring it.'
      )
      localStorage.setItem('announcedOldData', Date.now().toString())
    }
  }
}
