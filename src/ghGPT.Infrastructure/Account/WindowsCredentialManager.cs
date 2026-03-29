using System.Runtime.InteropServices;
using System.Text;

namespace ghGPT.Infrastructure.Account;

internal static class WindowsCredentialManager
{
    private const string TargetName = "ghGPT:GitHubToken";

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredWriteW(ref CREDENTIAL credential, uint flags);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredReadW(string target, CRED_TYPE type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CredDeleteW(string target, CRED_TYPE type, int flags);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern void CredFree(IntPtr buffer);

    private enum CRED_TYPE : uint
    {
        Generic = 1,
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL
    {
        public uint Flags;
        public CRED_TYPE Type;
        public string TargetName;
        public string? Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string? TargetAlias;
        public string UserName;
    }

    public static void Save(string token)
    {
        var tokenBytes = Encoding.Unicode.GetBytes(token);
        var handle = GCHandle.Alloc(tokenBytes, GCHandleType.Pinned);
        try
        {
            var cred = new CREDENTIAL
            {
                Type = CRED_TYPE.Generic,
                TargetName = TargetName,
                CredentialBlobSize = (uint)tokenBytes.Length,
                CredentialBlob = handle.AddrOfPinnedObject(),
                Persist = 2, // CRED_PERSIST_LOCAL_MACHINE
                UserName = "ghGPT",
            };
            if (!CredWriteW(ref cred, 0))
                throw new InvalidOperationException($"Token konnte nicht gespeichert werden (Win32: {Marshal.GetLastWin32Error()})");
        }
        finally
        {
            handle.Free();
        }
    }

    public static string? Load()
    {
        if (!CredReadW(TargetName, CRED_TYPE.Generic, 0, out var ptr))
            return null;
        try
        {
            var cred = Marshal.PtrToStructure<CREDENTIAL>(ptr);
            if (cred.CredentialBlobSize == 0 || cred.CredentialBlob == IntPtr.Zero)
                return null;
            var bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, bytes.Length);
            return Encoding.Unicode.GetString(bytes);
        }
        finally
        {
            CredFree(ptr);
        }
    }

    public static void Delete()
    {
        CredDeleteW(TargetName, CRED_TYPE.Generic, 0);
    }
}
